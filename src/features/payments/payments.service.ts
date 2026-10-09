// Lógica de cobro con Stripe: checkout, confirmación y rechazo.
//
// Regla de oro (SCRUM sección 13): la reserva NO se considera pagada porque el
// navegador volvió a la app, sino cuando el webhook oficial de Stripe confirma
// el pago. Este módulo orquesta ese ciclo:
//
//   reserva pending_payment → checkout → webhook → pago succeeded
//     → hold consumed + cupos a booked + QR emitidos (persona x zona).
//
// Todo es idempotente: los pasos condicionales (updateMany por estado, QR por
// conteo) hacen que reprocesar un evento sea un no-op seguro.
import type Stripe from "stripe";

import { emitirQrDeReserva, type QrEmitido } from "@/features/reservations/qr";
import { ConflictError, HttpError, NotFoundError } from "@/shared/http/errors";
import { db } from "@/shared/lib/db";
import { env } from "@/shared/lib/env";
import { getStripe } from "@/shared/lib/stripe";

import {
  consumirHoldYTrasladarCupos,
  createPendingPayment,
  liberarCuposDeReserva,
  rejectPayment,
  settlePayment,
} from "./payments.repository";
import type { CreatePaymentInput } from "./payments.schemas";
import type { StripeCheckoutSessionResult } from "./payments.types";

/** Cliente mínimo de Stripe que usa este módulo (inyectable en pruebas). */
export type StripeCheckoutClient = Pick<Stripe, "checkout">;

export async function createCheckoutSession(
  input: CreatePaymentInput,
  stripeClient: StripeCheckoutClient = getStripe(),
): Promise<StripeCheckoutSessionResult> {
  const reserva = await db.reservation.findUnique({
    where: { id: input.reservationId },
    select: {
      id: true,
      status: true,
      totalCop: true,
      startsAt: true,
      endsAt: true,
      service: { select: { name: true } },
    },
  });
  if (!reserva) throw new NotFoundError("Reserva no encontrada");
  if (reserva.status !== "pending_payment") {
    throw new ConflictError(`Esta reserva está ${reserva.status} y no se puede pagar.`);
  }
  // El monto real lo define el servidor: el body podría venir manipulado.
  if (input.amountCop !== reserva.totalCop) {
    throw new ConflictError("El monto no coincide con el total de la reserva.");
  }

  const hold = await db.reservationHold.findFirst({
    where: { reservationId: reserva.id, status: "active", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!hold) {
    throw new ConflictError("El bloqueo de 10 minutos expiró. Vuelve a crear la reserva.");
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: "payment",
    currency: "cop",
    line_items: [
      {
        price_data: {
          currency: "cop",
          product_data: {
            name: `Reserva Omega Complex - ${reserva.service.name}`,
            description:
              `${reserva.startsAt.toLocaleDateString("es-CO")} ` +
              `${reserva.startsAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} - ` +
              `${reserva.endsAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`,
          },
          unit_amount: reserva.totalCop,
        },
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { reservationId: reserva.id },
  });

  if (!session.url) {
    throw new HttpError(502, "CHECKOUT_SIN_URL", "Stripe no devolvió la URL de pago.");
  }

  // Idempotente por stripeSessionId: un reintento del cliente no duplica el cobro.
  const payment = await createPendingPayment({
    reservationId: reserva.id,
    amountCop: reserva.totalCop,
    stripeSessionId: session.id,
    method: input.method,
  });
  await db.payment.update({
    where: { id: payment.id },
    data: { stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null },
  });

  return { sessionId: session.id, checkoutUrl: session.url, paymentId: payment.id };
}

export type ConfirmacionPago =
  | { transitioned: true; emitidos: QrEmitido[] }
  | { transitioned: false; emitidos: [] };

/**
 * Liquida un pago confirmado por Stripe: reserva a confirmed, hold consumido,
 * cupos a booked y QR emitidos. Los tokens crudos se devuelven UNA vez para
 * enviarlos por correo (solo se guardan los hashes).
 */
export async function confirmarPagoExitoso(input: {
  paymentId: string;
  stripePaymentIntentId: string;
}): Promise<ConfirmacionPago> {
  const { payment, transitioned } = await settlePayment({
    paymentId: input.paymentId,
    stripePaymentIntentId: input.stripePaymentIntentId,
  });
  if (!transitioned) return { transitioned: false, emitidos: [] };

  await consumirHoldYTrasladarCupos(payment.reservationId);

  const emision = await emitirQrDeReserva(payment.reservationId);
  if (!emision.ok) {
    // El pago ya quedó liquidado; esto exige revisión manual y reintento del
    // webhook (la emisión es idempotente, el reproceso es seguro).
    throw new HttpError(500, "QR_SIN_EMITIR", emision.message);
  }
  return { transitioned: true, emitidos: emision.emitidos };
}

/** Marca el pago como fallido y devuelve los cupos retenidos al inventario. */
export async function rechazarPago(input: { paymentId: string; reason?: string | null }) {
  const payment = await rejectPayment({ paymentId: input.paymentId, reason: input.reason });
  await liberarCuposDeReserva(payment.reservationId);
  return payment;
}

export function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL;
}
