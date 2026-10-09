import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { getStripe } from "@/shared/lib/stripe";
import {
  getPaymentByIntentId,
  getPaymentBySessionId,
  recordStripeEvent,
} from "@/features/payments/payments.repository";
import { confirmarPagoExitoso, rechazarPago } from "@/features/payments/payments.service";

// ---------------------------------------------------------------------------
// Webhook de Stripe (SCRUM seccion 13).
//
// La confirmacion NO se basa en que el navegador vuelva a la app: se procesa el
// evento oficial de Stripe, verificando la firma con STRIPE_WEBHOOK_SECRET.
// StripeEvent.eventId hace de idempotencia: si el mismo evento llega dos veces,
// se responde 200 y no se procesa de nuevo.
// ---------------------------------------------------------------------------

/** Stripe manda el cuerpo crudo: hay que leerlo como texto para verificar la firma. */
async function readRawBody(req: Request): Promise<string> {
  return await req.text();
}

export const POST = handler(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { data: null, error: { code: "NO_SIGNATURE", message: "Falta la firma de Stripe." } },
      { status: 400 },
    );
  }

  const raw = await readRawBody(req);
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "NO_WEBHOOK_SECRET", message: "STRIPE_WEBHOOK_SECRET no está configurado." },
      },
      { status: 500 },
    );
  }

  // Si la firma no valida, el evento no viene de Stripe: se rechaza entero.
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "BAD_SIGNATURE", message: "Firma de Stripe inválida." } },
      { status: 400 },
    );
  }

  const { applied } = await recordStripeEvent({
    eventId: event.id,
    type: event.type,
    payload: event.data.object as unknown,
  });
  if (!applied) {
    // Evento repetido: se acusa recibo para que Stripe deje de reintentar.
    return NextResponse.json(ok({ received: true, duplicate: true }));
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { qrEmitidos } = await handleCheckoutCompleted(session);
      return NextResponse.json(ok({ received: true, qrEmitidos }));
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const payment = await getPaymentBySessionId(session.id);
      if (payment && payment.status === "pending") {
        await rechazarPago({ paymentId: payment.id, reason: "La sesión de pago expiró." });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const payment = await getPaymentByIntentId(intent.id);
      if (payment && payment.status === "pending") {
        await rechazarPago({
          paymentId: payment.id,
          reason: intent.last_payment_error?.message ?? "Stripe rechazó el pago.",
        });
      }
      break;
    }
    default:
      // Evento registrado e ignorado: se podra agregar el manejo sin migrar.
      break;
  }

  return NextResponse.json(ok({ received: true }));
});

/**
 * El pago quedo confirmado: se liquida el Payment, la reserva pasa a
 * confirmed, los cupos retenidos pasan a confirmados y se emiten los QR
 * (persona x zona). Todo idempotente: reprocesar es un no-op seguro.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ qrEmitidos: number }> {
  const payment = await getPaymentBySessionId(session.id);
  if (!payment || payment.status !== "pending") return { qrEmitidos: 0 };

  const intentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  if (!intentId) return { qrEmitidos: 0 };

  const confirmacion = await confirmarPagoExitoso({
    paymentId: payment.id,
    stripePaymentIntentId: intentId,
  });
  return { qrEmitidos: confirmacion.transitioned ? confirmacion.emitidos.length : 0 };
}