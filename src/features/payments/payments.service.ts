import Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { env } from "@/shared/lib/env";
import { db } from "@/shared/lib/db";

import { createPayment, getPaymentById, getPaymentByStripeSession, getPaymentByStripeIntent, updatePaymentStatus, createStripeEvent, stripeEventExists } from "./payments.repository";
import { HttpError } from "@/shared/http/errors";
import { confirmReservationAndGenerateQrs, rejectReservation } from "@/features/reservations/reservations.service";

import type { CreatePaymentInput } from "./payments.schemas";
import type { StripeCheckoutSessionResult } from "./payments.types";

export async function createCheckoutSession(
  input: CreatePaymentInput
): Promise<StripeCheckoutSessionResult> {
  const reservation = await db.reservation.findUnique({
    where: { id: input.reservationId },
    include: { service: { select: { id: true, name: true } } },
  });

  if (!reservation) {
    throw new HttpError(404, "RESERVATION_NOT_FOUND", "Reserva no encontrada");
  }

  if (reservation.status !== "pending_payment") {
    throw new HttpError(400, "INVALID_RESERVATION_STATUS", "La reserva no está en estado de pago pendiente");
  }

  const payment = await createPayment({
    reservationId: input.reservationId,
    method: input.method,
    amountCop: input.amountCop,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "cop",
    line_items: [
      {
        price_data: {
          currency: "cop",
          product_data: {
            name: `Reserva - ${reservation.service.name}`,
            description: `Fecha: ${new Date(reservation.startsAt).toLocaleDateString("es-CO")} | Horario: ${reservation.startsAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} - ${reservation.endsAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`,
          },
          unit_amount: input.amountCop,
        },
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      reservationId: input.reservationId,
      paymentId: payment.id,
    },
    payment_intent_data: {
      metadata: {
        reservationId: input.reservationId,
        paymentId: payment.id,
      },
    },
  });

  await db.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id, status: "pending" },
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url!,
    paymentId: payment.id,
  };
}

export async function handleStripeWebhook(payload: string, signature: string): Promise<{ received: boolean }> {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new HttpError(500, "WEBHOOK_SECRET_MISSING", "STRIPE_WEBHOOK_SECRET no configurado");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new HttpError(400, "WEBHOOK_SIGNATURE_INVALID", `Firma de webhook inválida: ${err}`);
  }

  if (await stripeEventExists(event.id)) {
    return { received: true };
  }

  await createStripeEvent(event.id, {
    type: event.type,
    payload: event.data.object,
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session & { receipt_url?: string };
      const paymentId = session.metadata?.paymentId;
      const reservationId = session.metadata?.reservationId;

      if (paymentId && reservationId) {
        const payment = await getPaymentByStripeSession(session.id);
        if (payment && payment.status !== "succeeded") {
          await updatePaymentStatus(paymentId, "succeeded", new Date());
          await confirmReservationAndGenerateQrs(reservationId, paymentId);
        }
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      const reservationId = session.metadata?.reservationId;

      if (paymentId && reservationId) {
        const payment = await getPaymentByStripeSession(session.id);
        if (payment && payment.status === "pending") {
          await updatePaymentStatus(paymentId, "failed");
          await rejectReservation(reservationId, paymentId);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const paymentId = intent.metadata?.paymentId;
      const reservationId = intent.metadata?.reservationId;

      if (paymentId && reservationId) {
        const payment = await getPaymentByStripeIntent(intent.id);
        if (payment && payment.status === "pending") {
          await updatePaymentStatus(paymentId, "failed");
          await rejectReservation(reservationId, paymentId);
        }
      }
      break;
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent & { charges?: { data: Array<{ receipt_url?: string }> } };
      const paymentId = intent.metadata?.paymentId;
      const reservationId = intent.metadata?.reservationId;

      if (paymentId && reservationId) {
        const payment = await getPaymentByStripeIntent(intent.id);
        if (payment && payment.status !== "succeeded") {
          await updatePaymentStatus(paymentId, "succeeded", new Date());
          await confirmReservationAndGenerateQrs(reservationId, paymentId);
        }
      }
      break;
    }
  }

  return { received: true };
}