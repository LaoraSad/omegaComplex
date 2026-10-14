// Lógica de cobro con Stripe: checkout, confirmación y rechazo.
//
// Regla de oro (SCRUM sección 13): la reserva NO se considera pagada porque el
// navegador volvió a la app, sino cuando el webhook oficial de Stripe confirma
// el pago. Este módulo orquesta ese ciclo:
//
//   reserva pending_payment ’ checkout ’ webhook ’ pago succeeded
//     ’ hold consumed + cupos a booked + QR emitidos (persona x zona).
//
// Todo es idempotente: los pasos condicionales (updateMany por estado, QR por
// conteo) hacen que reprocesar un evento sea un no-op seguro.
import type Stripe from "stripe";

import { emitirQrDeReserva, type QrEmitido } from "@/features/reservations/qr";
import { ConflictError, HttpError, NotFoundError } from "@/shared/http/errors";
import { db } from "@/shared/lib/db";
import { env } from "@/shared/lib/env";
import { getStripe } from "@/shared/lib/stripe";
import { logger } from "@/shared/lib/logger";
import { sendQrEmail, type QrParaCorreo } from "@/lib/email/resend";
import { enviarEvento, n8nConfigurado } from "@/shared/integrations/n8n";
import { generarPdfQr } from "@/shared/pdf/qr-pdf";

import {
  consumirHoldYTrasladarCupos,
  createPendingPayment,
  liberarCuposDeReserva,
  rejectPayment,
  obtenerContactoQr,
  settlePayment,
} from "./payments.repository";
import type { CreatePaymentInput } from "./payments.schemas";
import type { StripeCheckoutSessionResult } from "./payments.types";

/** Cliente mínimo de Stripe que usa este módulo (inyectable en pruebas). */
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
 * Arma las líneas del checkout: una por zona.
 *
 /**
 * Convierte pesos a la unidad mínima que espera la API de Stripe.
 *
 * Stripe NO recibe pesos: recibe centavos. El peso colombiano tiene dos
 * decimales en su API, así que 100.000 COP se envían como 10.000.000. Sin esta
 * conversión Stripe interpreta 100.000 como $1.000,00 y además lo rechaza con
 * `amount_too_small`, porque ese monto no alcanza el mínimo de la cuenta.
 *
 * Todo el resto del sistema (base de datos, correos, pantallas) trabaja en
 * pesos enteros; la conversión ocurre solo al hablar con Stripe.
 */
function aCentimos(cop: number): number {
  return Math.round(cop * 100);
}

/**
 * El reparto NO es proporcional a las horas: es proporcional a las personas que
 * entran por cada puerta. Ir solo a la cancha no puede costar lo mismo que ir
 * con tres amigos a la piscina, aunque ambas franjas duren una hora. La última
 * línea absorbe el redondeo para que la suma cuadre con el total de la reserva.
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
    const nombres = b.guests.map((g) => g.guest?.fullName?.trim()).filter(Boolean);
    return [
      {
        price_data: {
          currency: "cop",
          product_data: {
            name: `Reserva Omega Complex · ${b.service.name}`,
            description:
              `${fechaBogota(b.startsAt)} · ${horaBogota(b.startsAt)} a ${horaBogota(b.endsAt)}` +
              (nombres.length ? ` · ${nombres.join(", ")}` : ` · ${b.personas} persona(s)`),
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
    const nombres = b.guests.map((g) => g.guest?.fullName?.trim()).filter(Boolean);
    return {
      price_data: {
        currency: "cop" as const,
        product_data: {
          name: `${b.service.name} · ${b.service.category.name}`,
          description:
            `${fechaBogota(b.startsAt)} · ${horaBogota(b.startsAt)} a ${horaBogota(b.endsAt)}` +
            ` · ${b.personas} ${b.personas === 1 ? "persona" : "personas"}` +
            (nombres.length ? ` · ${nombres.join(", ")}` : ""),
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
      // mostrarlas todas: antes solo aparecía `service.name`, que es el primer
      // bloque, y el cliente pagaba sin ver que también estaba reservando la
      // segunda zona.
      blocks: {
        orderBy: { startsAt: "asc" },
        select: {
          startsAt: true,
          endsAt: true,
          personas: true,
          service: { select: { name: true, category: { select: { name: true } } } },
          // Los nombres de quienes entran por esa puerta: es lo que se imprime
          // en la línea del cobro.
          guests: { select: { guest: { select: { fullName: true } } } },
        },
      },
      guests: { orderBy: [{ isTitular: "desc" }, { fullName: "asc" }], select: { fullName: true } },
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

/** El cobro entró pero el hold de 10 min ya expiró: no hay qué liquidar. */
export const PAGO_TARDIO_CODE = "PAGO_TARDIO_REQUIERE_REVISION";

/**
 * Liquida un pago confirmado por Stripe: reserva a confirmed, hold consumido,
 * cupos a booked y QR emitidos. Los tokens crudos se devuelven UNA vez para
 * enviarlos por correo (solo se guardan los hashes).
 *
 * P0-3: si el hold expiró antes de que llegara la confirmación (webhook lento
 * o pantalla de espera tardía), NO se liquida ni se emiten QRs. El dinero sí
 * puede estar cobrado en Stripe, así que el caso se registra para revisión
 * manual: reembolsar o revivir la reserva lo decide el negocio, fuera de la app.
 */
export async function confirmarPagoExitoso(input: {
  paymentId: string;
  stripePaymentIntentId: string;
}): Promise<ConfirmacionPago> {
  const pago = await db.payment.findFirst({
    where: { id: input.paymentId },
    select: { reservationId: true, status: true },
  });
  if (!pago) throw new NotFoundError("Pago no encontrado");
  if (pago.status !== "pending") return { transitioned: false, emitidos: [] };

  const reserva = await db.reservation.findUnique({
    where: { id: pago.reservationId },
    select: { status: true },
  });
  const holdVigente =
    reserva?.status === "pending_payment"
      ? await db.reservationHold.findFirst({
          where: {
            reservationId: pago.reservationId,
            status: "active",
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        })
      : null;
  if (!reserva || reserva.status !== "pending_payment" || !holdVigente) {
    logger.error("pago.tardio_requiere_revision_manual", {
      paymentId: input.paymentId,
      reservationId: pago.reservationId,
      estadoReserva: reserva?.status ?? null,
    });
    throw new HttpError(
      409,
      PAGO_TARDIO_CODE,
      "El pago llegó tras expirar el bloqueo de 10 minutos. Requiere revisión manual: no se emitieron QRs.",
    );
  }

  const { payment, transitioned } = await settlePayment({
    paymentId: input.paymentId,
    stripePaymentIntentId: input.stripePaymentIntentId,
  });
  if (!transitioned) return { transitioned: false, emitidos: [] };

  // Cierra la carrera: el hold pudo expirar entre la verificación y la
  // liquidación. Si la reserva no quedó confirmed, no se emiten QRs.
  const confirmada = await db.reservation.findUnique({
    where: { id: payment.reservationId },
    select: { status: true },
  });
  if (!confirmada || confirmada.status !== "confirmed") {
    logger.error("pago.tardio_requiere_revision_manual", {
      paymentId: input.paymentId,
      reservationId: payment.reservationId,
      estadoReserva: confirmada?.status ?? null,
    });
    throw new HttpError(
      409,
      PAGO_TARDIO_CODE,
      "El pago llegó tras expirar el bloqueo de 10 minutos. Requiere revisión manual: no se emitieron QRs.",
    );
  }

  await consumirHoldYTrasladarCupos(payment.reservationId);

  const emision = await emitirQrDeReserva(payment.reservationId);
  if (!emision.ok) {
    // El pago ya quedó liquidado; esto exige revisión manual y reintento del
    // webhook (la emisión es idempotente, el reproceso es seguro).
    throw new HttpError(500, "QR_SIN_EMITIR", emision.message);
  }

  // El correo se envía desde acá y no desde el webhook a propósito: la reserva
  // se puede liquidar por más de una vía (webhook de Stripe o recuperación
  // desde la pantalla de espera) y los QR son la única entrega de los códigos.
  // Si el envío viviera solo en el webhook, un pago recuperado a mano confirmó
  // la reserva sin mandarle nada al cliente.
  //
  // Los tokens crudos se consumed acá: en la base solo quedan los hashes.
  await entregarQrPorCorreo(payment.reservationId, emision.emitidos);

  return { transitioned: true, emitidos: emision.emitidos };
}

/**
 * Manda los QR por correo, por n8n si está configurado y por Resend si no.
 *
 * Nunca lanza: el pago ya está liquidado y perderlo por un correo que no salió
 * sería peor que no enviarlo. Queda registrado para revisión manual.
 */
async function entregarQrPorCorreo(
  reservationId: string,
  emitidos: QrEmitido[],
): Promise<void> {
  try {
    const contacto = await obtenerContactoQr(reservationId);
    if (!contacto) return;

    const fecha = contacto.startsAt.toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const entregado = await enviarPdfPorN8n({
      email: contacto.email,
      nombre: contacto.nombre,
      fecha,
      codigos: emitidos,
      documento: contacto.documento,
    });

    if (!entregado) {
      await sendQrEmail(contacto.email, {
        nombre: contacto.nombre,
        fecha,
        codigos: emitidos,
      });
    }
  } catch (error) {
    logger.error("pago.qr_email_fallido", { reservationId, error });
  }
}

/**
 * Genera el PDF y se lo pasa a n8n, que es quien lo manda. Devuelve si la
 * entrega quedó hecha, para que el llamador sepa si aplicar el plan B.
 */
async function enviarPdfPorN8n(input: {
  email: string;
  nombre: string;
  fecha: string;
  codigos: QrParaCorreo[];
  documento?: string | null;
}): Promise<boolean> {
  if (!n8nConfigurado()) return false;

  const pdf = await generarPdfQr({
    nombre: input.nombre,
    fecha: input.fecha,
    codigos: input.codigos,
    documento: input.documento ?? null,
  });

  const { entregado, motivo } = await enviarEvento("reserva.confirmada", {
    email: input.email,
    nombre: input.nombre,
    fecha: input.fecha,
    // El PDF va en base64: n8n lo lee, lo adjunta al correo y lo borra.
    pdfBase64: Buffer.from(pdf).toString("base64"),
    pdfNombre: `codigos-qr-${input.fecha.replace(/\s+/g, "-")}.pdf`,
    codigos: input.codigos.map((q) => ({
      etiqueta: q.etiqueta,
      nombre: q.nombre,
      servicio: q.servicio,
      zona: q.zona,
      // El token crudo viaja en el evento porque es lo que hay que dibujar en
      // el QR del PDF; se genera aquí y no se guarda en la base.
      token: q.token,
      // Respaldo transcribible para cuando la cámara de la puerta falla.
      codigoCorto: q.codigoCorto,
    })),
  });

  if (!entregado) {
    logger.warn("pago.n8n_no_entrego_pdf", { motivo });
  }
return entregado;
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
