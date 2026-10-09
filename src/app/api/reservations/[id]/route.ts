import { NextResponse } from "next/server";

import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { UnauthorizedError, NotFoundError, ConflictError } from "@/shared/http/errors";
import { getSession } from "@/shared/auth/session";
import { getCustomerReservation } from "@/features/reservations/reservations.repository";
import { db } from "@/shared/lib/db";

// ---------------------------------------------------------------------------
// Detalle de una reserva del cliente autenticado.
// ---------------------------------------------------------------------------

async function reservaDelCliente(id: string) {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  const reserva = await getCustomerReservation(session.userId, id);
  if (!reserva) throw new NotFoundError("Reserva no encontrada");
  return reserva;
}

export const GET = handler(async (_req, ctx) => {
  const { id } = await ctx!.params!;
  const r = await reservaDelCliente(id);
  return NextResponse.json(
    ok({
      id: r.id,
      status: r.status,
      serviceId: r.serviceId,
      serviceName: r.service.name,
      personas: r.quantity,
      totalCop: r.totalCop,
      inicia: r.startsAt,
      termina: r.endsAt,
      qr: r.qrTokens.map((q) => ({ seqNo: q.seqNo, status: q.status })),
      pagos: r.payments.map((p) => ({ status: p.status, amountCop: p.amountCop })),
    }),
  );
});

/**
 * Inicia el pago. Es el punto de entrada de la pasarela de Stripe, que todavía
 * no está conectada: se responde 501 con el contrato exacto que debe cumplir,
 * en vez de dejar un botón que no hace nada (SCRUM sección 13).
 *
 * Lo que falta implementar:
 *   1. Crear la Checkout Session de Stripe por r.totalCop.
 *   2. Guardarla con createPendingPayment({ reservationId, amountCop, stripeSessionId }).
 *   3. Devolver la url de Stripe para redirigir al cliente.
 * El webhook ya está preparado en /api/payments/webhook.
 */
export const POST = handler(async (_req, ctx) => {
  const { id } = await ctx!.params!;
  const r = await reservaDelCliente(id);

  if (r.status !== "pending_payment") {
    throw new ConflictError(`Esta reserva está ${r.status} y no se puede volver a pagar.`);
  }

  // El bloqueo caduca a los 10 minutos: si ya pasó, la franja se liberó.
  const activa = await db.reservationHold.findFirst({
    where: { reservationId: id, status: "active", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!activa) {
    throw new ConflictError("El bloqueo de 10 minutos expiró. Vuelve a crear la reserva.");
  }

  return NextResponse.json(
    {
      data: null,
      error: {
        code: "PAYMENT_NOT_CONNECTED",
        message:
          "La pasarela de pago todavía no está conectada. Se implementa con Stripe: falta crear la Checkout Session y devolver su url.",
      },
    },
    { status: 501 },
  );
});