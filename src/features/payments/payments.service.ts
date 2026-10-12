// LÃ³gica de cobro con Stripe: checkout, confirmaciÃ³n y rechazo.
//
// Regla de oro (SCRUM secciÃ³n 13): la reserva NO se considera pagada porque el
// navegador volviÃ³ a la app, sino cuando el webhook oficial de Stripe confirma
// el pago. Este mÃ³dulo orquesta ese ciclo:
//
//   reserva pending_payment â†’ checkout â†’ webhook â†’ pago succeeded
//     â†’ hold consumed + cupos a booked + QR emitidos (persona x zona).
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

/** Cliente mÃ­nimo de Stripe que usa este mÃ³dulo (inyectable en pruebas). */
export type StripeCheckoutClient = Pick<Stripe, "checkout">;

/** Hora 24 h en America/Bogota, para el texto del checkout. */
function horaBogota(d: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function fechaBogota(d: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Arma las lÃ­neas del checkout: una por zona.
 *
 /**
 * Convierte pesos a la unidad mÃ­nima que espera la API de Stripe.
 *
 * Stripe NO recibe pesos: recibe centavos. El peso colombiano tiene dos
 * decimales en su API, asÃ­ que 100.000 COP se envÃ­an como 10.000.000. Sin esta
 * conversiÃ³n Stripe interpreta 100.000 como $1.000,00 y ademÃ¡s lo rechaza con
 * `amount_too_small`, porque ese monto no alcanza el mÃ­nimo de la cuenta.
 *
 * Todo el resto del sistema (base de datos, correos, pantallas) trabaja en
 * pesos enteros; la conversiÃ³n ocurre solo al hablar con Stripe.
 */
function aCentimos(cop: number): number {
  return Math.round(cop * 100);
}

/**
 * El reparto NO es proporcional a las horas: es proporcional a las personas que
 * entran por cada puerta. Ir solo a la cancha no puede costar lo mismo que ir
 * con tres amigos a la piscina, aunque ambas franjas duren una hora. La Ãºltima
 * lÃ­nea absorbe el redondeo para que la suma cuadre con el total de la reserva.
 */
function lineItemsDeReserva(
  reserva: {
    totalCop: number;
    quantity: number;
    blocks: {
      startsAt: Date;
      endsAt: Date;
      personas: number;
      service: { name: string; category: { name: string } };
      guests: { guest: { fullName: string } }[];
    }[];
  },
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const { totalCop, blocks } = reserva;

  if (blocks.length === 1) {
    const b = blocks[0];
    const nombres = b.guests.map((g) => g.guest.fullName.trim()).filter(Boolean);
    return [
      {
        price_data: {
          currency: "cop",
          product_data: {
            name: `Reserva Omega Complex Â· ${b.service.name}`,
            description:
              `${fechaBogota(b.startsAt)} Â· ${horaBogota(b.startsAt)} a ${horaBogota(b.endsAt)}` +
              (nombres.length ? ` Â· ${nombres.join(", ")}` : ` Â· ${b.personas} persona(s)`),
          },
          unit_amount: aCentimos(totalCop),
        },
        quantity: 1,
      },
    ];
  }

  const pesos = blocks.map((b) => b.personas);
  const totalPersonas = pesos.reduce((a, b) => a + b, 0);
  const montos = blocks.map((_, i) => Math.floor((totalCop * pesos[i]) / totalPersonas));
  montos[montos.length - 1] += totalCop - montos.reduce((a, b) => a + b, 0);

  return blocks.map((b, i) => {
    const nombres = b.guests.map((g) => g.guest.fullName.trim()).filter(Boolean);
    return {
      price_data: {
        currency: "cop" as const,
        product_data: {
          name: `${b.service.name} Â· ${b.service.category.name}`,
          description:
            `${fechaBogota(b.startsAt)} Â· ${horaBogota(b.startsAt)} a ${horaBogota(b.endsAt)}` +
            ` Â· ${b.personas} ${b.personas === 1 ? "persona" : "personas"}` +
            (nombres.length ? ` Â· ${nombres.join(", ")}` : ""),
        },
        unit_amount: aCentimos(montos[i]),
      },
      quantity: 1,
    };
  });
}

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
      quantity: true,
      startsAt: true,
      endsAt: true,
      service: { select: { name: true } },
      // Una reserva puede abarcar varias zonas. El checkout de Stripe tiene que
      // mostrarlas todas: antes solo aparecÃ­a `service.name`, que es el primer
      // bloque, y el cliente pagaba sin ver que tambiÃ©n estaba reservando la
      // segunda zona.
      blocks: {
        orderBy: { startsAt: "asc" },
        select: {
          startsAt: true,
          endsAt: true,
          personas: true,
          service: { select: { name: true, category: { select: { name: true } } } },
          // Los nombres de quienes entran por esa puerta: es lo que se imprime
          // en la lÃ­nea del cobro.
          guests: { select: { guest: { select: { fullName: true } } } },
        },
      },
      guests: { orderBy: [{ isTitular: "desc" }, { fullName: "asc" }], select: { fullName: true } },
    },
  });
  if (!reserva) throw new NotFoundError("Reserva no encontrada");
  if (reserva.status !== "pending_payment") {
    throw new ConflictError(`Esta reserva estÃ¡ ${reserva.status} y no se puede pagar.`);
  }
  // El monto real lo define el servidor: el body podrÃ­a venir manipulado.
  if (input.amountCop !== reserva.totalCop) {
    throw new ConflictError("El monto no coincide con el total de la reserva.");
  }

  const hold = await db.reservationHold.findFirst({
    where: { reservationId: reserva.id, status: "active", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!hold) {
    throw new ConflictError("El bloqueo de 10 minutos expirÃ³. Vuelve a crear la reserva.");
  }

  const lineas = lineItemsDeReserva(reserva);
  const session = await stripeClient.checkout.sessions.create({
    mode: "payment",
    currency: "cop",
    line_items: lineas,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      reservationId: reserva.id,
      zonas: String(reserva.blocks.length),
      personas: String(reserva.quantity),
    },
  });

  if (!session.url) {
    throw new HttpError(502, "CHECKOUT_SIN_URL", "Stripe no devolviÃ³ la URL de pago.");
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
    // El pago ya quedÃ³ liquidado; esto exige revisiÃ³n manual y reintento del
    // webhook (la emisiÃ³n es idempotente, el reproceso es seguro).
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
