import type { Prisma } from "@prisma/client";

import { db } from "@/shared/lib/db";

// ---------------------------------------------------------------------------
// Datos de pagos. Las tablas Payment y StripeEvent ya existen y estan
// migradas: aqui solo se estructura como se usan. La integracion con la API de
// Stripe la implementa quien cierre la pasarela; esta capa no llama a Stripe.
//
// Idempotencia (SCRUM: "El sistema debera manejar idempotencia para evitar
// duplicar reservas/pagos"): StripeEvent.eventId es la clave primaria, asi que
// un evento repetido choca y se descarta.
// ---------------------------------------------------------------------------

export type PaymentRow = {
  id: string;
  reservationId: string;
  method: string;
  status: string;
  amountCop: number;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

const paymentSelect = {
  id: true,
  reservationId: true,
  method: true,
  status: true,
  amountCop: true,
  stripeSessionId: true,
  stripePaymentIntentId: true,
  paidAt: true,
  createdAt: true,
} as const;

/**
 * Crea el pago pendiente de una reserva. Idempotente por
 * stripeSessionId: si el cliente reintenta, devuelve el pago existente en vez
 * de duplicar el cobro.
 */
export async function createPendingPayment(input: {
  reservationId: string;
  amountCop: number;
  stripeSessionId: string;
  method?: "card" | "cash";
}): Promise<PaymentRow> {
  return db.payment.upsert({
    where: { stripeSessionId: input.stripeSessionId },
    update: {},
    create: {
      reservationId: input.reservationId,
      amountCop: input.amountCop,
      stripeSessionId: input.stripeSessionId,
      method: input.method ?? "card",
      status: "pending",
    },
    select: paymentSelect,
  }) as Promise<PaymentRow>;
}

export async function getPaymentBySessionId(sessionId: string): Promise<PaymentRow | null> {
  const row = await db.payment.findUnique({ where: { stripeSessionId: sessionId }, select: paymentSelect });
  return (row as PaymentRow | null) ?? null;
}

export async function getPaymentByIntentId(intentId: string): Promise<PaymentRow | null> {
  const row = await db.payment.findUnique({
    where: { stripePaymentIntentId: intentId },
    select: paymentSelect,
  });
  return (row as PaymentRow | null) ?? null;
}

export async function listPaymentsByReservation(reservationId: string): Promise<PaymentRow[]> {
  const rows = await db.payment.findMany({
    where: { reservationId },
    orderBy: { createdAt: "desc" },
    select: paymentSelect,
  });
  return rows as PaymentRow[];
}

/**
 * Marca el pago como pagado y mueve la reserva a confirmada, en una sola
 * transaccion. La reserva solo avanza si sigue pendiente: un webhook repetido
 * no la reabre ni la duplica.
 *
 * La emision de los QR no ocurre aqui: le toca a features/reservations cuando
 * confirma la reserva, porque el token crudo se genera en ese momento.
 */
export async function settlePayment(input: {
  paymentId: string;
  stripePaymentIntentId: string;
}): Promise<{ payment: PaymentRow; transitioned: boolean }> {
  return db.$transaction(async (tx) => {
    const paidAt = new Date();

    const updated = await tx.payment.updateMany({
      where: { id: input.paymentId, status: "pending" },
      data: {
        status: "succeeded",
        stripePaymentIntentId: input.stripePaymentIntentId,
        paidAt,
      },
    });

    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      select: paymentSelect,
    });

    if (updated.count !== 1) {
      // El pago ya estaba liquidado: no se toca la reserva otra vez.
      return { payment: payment as PaymentRow, transitioned: false };
    }

    await tx.reservation.updateMany({
      where: { id: payment.reservationId, status: "pending_payment" },
      data: { status: "confirmed" },
    });

    return { payment: payment as PaymentRow, transitioned: true };
  });
}

/** Marca el pago como fallido y la reserva como rechazada. */
export async function rejectPayment(input: {
  paymentId: string;
  reason?: string | null;
}): Promise<PaymentRow> {  return db.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: input.paymentId },
      data: { status: "failed" },
      select: paymentSelect,
    });
    await tx.reservation.updateMany({
      where: { id: payment.reservationId, status: "pending_payment" },
      data: { status: "payment_rejected" },
    });
    return payment as PaymentRow;
  });
}

/**
 * Consume el hold activo y traslada los cupos de retenidos a confirmados.
 * Es el paso que convierte un pago liquidado en capacidad real ocupada.
 *
 * Idempotente: solo actúa si queda un hold activo. Si el webhook se reprocesa,
 * el segundo pase no encuentra hold activo y no toca los contadores.
 */
export async function consumirHoldYTrasladarCupos(
  reservationId: string,
): Promise<{ applied: boolean }> {
  return db.$transaction(async (tx) => {
    const consumidos = await tx.reservationHold.updateMany({
      where: { reservationId, status: "active" },
      data: { status: "consumed" },
    });
    if (consumidos.count === 0) return { applied: false };

    const puentes = await tx.reservationSlot.findMany({
      where: { reservationId },
      select: { slotId: true, quantity: true },
    });
    for (const p of puentes) {
      await tx.$executeRaw`
        UPDATE "ServiceSlot"
           SET "heldCount" = GREATEST("heldCount" - ${p.quantity}, 0),
               "bookedCount" = "bookedCount" + ${p.quantity}
         WHERE id = ${p.slotId}::uuid
      `;
    }
    return { applied: true };
  });
}

/**
 * Devuelve al inventario los cupos retenidos de una reserva cuyo pago falló
 * o expiró, y libera sus holds activos.
 *
 * Idempotente: si no hay holds activos (reserva ya confirmada o ya liberada),
 * no toca los contadores. Por eso es seguro llamarlo en cada rechazo.
 */
export async function liberarCuposDeReserva(
  reservationId: string,
): Promise<{ applied: boolean }> {
  return db.$transaction(async (tx) => {
    const liberados = await tx.reservationHold.updateMany({
      where: { reservationId, status: "active" },
      data: { status: "released" },
    });
    if (liberados.count === 0) return { applied: false };

    const puentes = await tx.reservationSlot.findMany({
      where: { reservationId },
      select: { slotId: true, quantity: true },
    });
    for (const p of puentes) {
      await tx.$executeRaw`
        UPDATE "ServiceSlot"
           SET "heldCount" = GREATEST("heldCount" - ${p.quantity}, 0)
         WHERE id = ${p.slotId}::uuid
      `;
    }
    return { applied: true };
  });
}

export type StripeEventInput = {
  eventId: string;
  type: string;
  payload: unknown;
  paymentId?: string | null;
};

/**
 * Registra un evento de Stripe. Devuelve applied=false cuando el evento ya
 * existia, que es la senal para devolver 200 a Stripe sin reprocesar.
 */
export async function recordStripeEvent(input: StripeEventInput): Promise<{ applied: boolean }> {
  try {
    await db.stripeEvent.create({
      data: {
        eventId: input.eventId,
        type: input.type,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        paymentId: input.paymentId ?? null,
      },
    });
    return { applied: true };
  } catch (error) {
    // Violacion de la clave primaria = evento repetido.
    if (isUniqueViolation(error)) return { applied: false };
    throw error;
  }
}

export async function hasStripeEvent(eventId: string): Promise<boolean> {
  return (await db.stripeEvent.count({ where: { eventId } })) > 0;
}

/** Ingresos confirmados por rango, para los reportes del administrador. */
export async function sumRevenue(from: Date, to: Date): Promise<number> {
  const agg = await db.payment.aggregate({
    where: { status: "succeeded", paidAt: { gte: from, lt: to } },
    _sum: { amountCop: true },
  });
  return agg._sum.amountCop ?? 0;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}