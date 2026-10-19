// -----------------------------------------------------------------------------
// src/app/api/payments/webhook/route.ts
// Endpoint POST /api/payments/webhook
// Webhook de Stripe: fuente de verdad del pago. Verifica firma e idempotencia.
// -----------------------------------------------------------------------------

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
import { confirmarPagoExitoso, PAGO_TARDIO_CODE, rechazarPago } from "@/features/payments/payments.service";
import { logger } from "@/shared/lib/logger";
import { HttpError } from "@/shared/http/errors";

// -----------------------------------------------------------------------------
// Webhook de Stripe (SCRUM sección 13).
//
// La confirmación NO se basa en que el navegador vuelva a la app: se procesa el
// evento oficial de Stripe, verificando la firma con STRIPE_WEBHOOK_SECRET.
// StripeEvent.eventId hace de idempotencia: si el mismo evento llega dos veces,
// se responde 200 y no se procesa de nuevo.
// -----------------------------------------------------------------------------

/** Stripe manda el cuerpo crudo: hay que leerlo como texto para verificar la firma. */
async function readRawBody(req: Request): Promise<string> {
  return await req.text();
}

// -----------------------------------------------------------------------------
// POST /api/payments/webhook
// Flujo:
//   1. Lee el header stripe-signature. Si falta, devuelve 400.
//   2. Lee el cuerpo crudo (req.text()) porque Stripe lo envía sin parsear.
//   3. Verifica la firma con getStripe().webhooks.constructEvent(). Si falla,
//      devuelve 400 BAD_SIGNATURE.
//   4. Registra el evento en la tabla StripeEvent (recordStripeEvent).
//      - Si el evento ya existe (applied = false), es un duplicado:
//        * Si es checkout.session.completed y el pago sigue pending, se
//          reintenta la liquidación (el intento anterior pudo caer a mitad).
//        * Si no, se responde 200 sin reprocesar.
//   5. Según el tipo de evento:
//        - checkout.session.completed: llama a handleCheckoutCompleted().
//        - checkout.session.expired: si el pago sigue pending, lo rechaza.
//        - payment_intent.payment_failed: si el pago sigue pending, lo rechaza.
//        - otros: se ignoran pero se registran.
//   6. Siempre responde 200 a Stripe para que no reintente el envío.
// -----------------------------------------------------------------------------
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
    // Evento repetido: normalmente se acusa recibo sin reprocesar. Pero si el
    // intento anterior se cayó a mitad de la liquidación (P1-1), el pago sigue
    // `pending` y hay que terminar el trabajo en vez de ignorarlo.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const payment = await getPaymentBySessionId(session.id);
      if (payment && payment.status === "pending") {
        logger.warn("webhook.reintento_termina_liquidacion", { paymentId: payment.id });
        const { qrEmitidos } = await handleCheckoutCompleted(session);
        return NextResponse.json(
          ok({ received: true, duplicate: true, recuperado: true, qrEmitidos }),
        );
      }
    }
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
      // Evento registrado e ignorado: se podrá agregar el manejo sin migrar.
      break;
  }

  return NextResponse.json(ok({ received: true }));
});

// -----------------------------------------------------------------------------
// handleCheckoutCompleted(session)
// Procesa el evento checkout.session.completed de Stripe.
//   1. Busca el payment por stripeSessionId.
//   2. Si no existe o ya no está pending, devuelve 0 QR emitidos.
//   3. Obtiene el payment_intent_id de la sesión.
//   4. Llama a confirmarPagoExitoso() que:
//        - Marca el payment como succeeded.
//        - Pasa la reserva a confirmed.
//        - Consume el hold y traslada cupos a booked.
//        - Emite los QR (uno por persona y zona).
//        - Envía el correo con los QR.
//   5. Si el pago es tardío (hold expirado), captura PAGO_TARDIO_CODE, registra
//      en logs y responde 200 para que Stripe no reintente.
// -----------------------------------------------------------------------------
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ qrEmitidos: number }> {
  const payment = await getPaymentBySessionId(session.id);
  if (!payment || payment.status !== "pending") return { qrEmitidos: 0 };

  const intentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  if (!intentId) return { qrEmitidos: 0 };

  try {
    const confirmacion = await confirmarPagoExitoso({
      paymentId: payment.id,
      stripePaymentIntentId: intentId,
    });

    // El correo con los QR lo manda confirmarPagoExitoso(), no esta ruta: la
    // reserva se puede liquidar también desde la pantalla de espera, y si el
    // envío viviera solo acá ese camino confirmaría sin mandarle nada al cliente.
    return { qrEmitidos: confirmacion.emitidos.length };
  } catch (error) {
    // Pago tardío: el dinero entró pero el hold expiró. Reintentarlo no sirve
    // (el hold no vuelve): se acusa recibo para que Stripe no reintente y el
    // caso queda en el log para revisión manual (reembolso o revivir).
    if (error instanceof HttpError && error.code === PAGO_TARDIO_CODE) {
      logger.error("webhook.pago_tardio_revision_manual", { paymentId: payment.id });
      return { qrEmitidos: 0 };
    }
    throw error;
  }
}
