// -----------------------------------------------------------------------------
// src/features/payments/payments.service.ts
// Lógica de cobro con Stripe: checkout, confirmación, rechazo y envío de QR.
// Regla de oro (SCRUM sección 13): la reserva NO se considera pagada porque el
// navegador volvió a la app, sino cuando el webhook oficial de Stripe confirma
// el pago.
// Ciclo: reserva pending_payment → checkout → webhook → pago succeeded
//        → hold consumido + cupos a booked + QR emitidos (persona x zona).
// Todo es idempotente: los pasos condicionales hacen que reprocesar un evento
// sea un no-op seguro.
// -----------------------------------------------------------------------------

import type Stripe from "stripe";

import { emitirQrDeReserva, type QrEmitido } from "@/features/reservations/qr";
import { ConflictError, HttpError, NotFoundError } from "@/shared/http/errors";
import { db } from "@/shared/lib/db";
import { env } from "@/shared/lib/env";
import { getStripe } from "@/shared/lib/stripe";
import { logger } from "@/shared/lib/logger";
import { sendPagoRechazadoEmail, sendQrEmail, type QrParaCorreo } from "@/lib/email/resend";
import { enviarEvento, n8nConfigurado } from "@/shared/integrations/n8n";
import { generarPdfQr } from "@/shared/pdf/qr-pdf";

import {
  consumirHoldYTrasladarCupos,
  createPendingPayment,
  liberarCuposDeReserva,
  rejectPayment,
  obtenerContactoAviso,
  obtenerContactoQr,
  settlePayment,
} from "./payments.repository";
import type { CreatePaymentInput } from "./payments.schemas";
import type { StripeCheckoutSessionResult } from "./payments.types";

// -----------------------------------------------------------------------------
// StripeCheckoutClient (tipo)
// Subconjunto del cliente de Stripe que usa este módulo (solo checkout).
// Se inyecta en pruebas para no llamar a la API real de Stripe.
// -----------------------------------------------------------------------------
export type StripeCheckoutClient = Pick<Stripe, "checkout">;

// -----------------------------------------------------------------------------
// horaBogota(d) / fechaBogota(d)
// Formateadores de fecha y hora en zona Bogotá (es-CO) para mostrar en el
// checkout de Stripe y en correos.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// aCentimos(cop)
// Convierte pesos colombianos a centavos (unidad mínima de Stripe).
// Se asume COP con 2 decimales: 100.000 COP → 10.000.000 centavos.
// No cambiar este multiplicador sin un pago de prueba en modo test.
// -----------------------------------------------------------------------------
export function aCentimos(cop: number): number {
  return Math.round(cop * 100);
}

// -----------------------------------------------------------------------------
// lineItemsDeReserva(reserva)
// Arma las líneas de items del checkout de Stripe, una por zona (bloque).
//   - Si hay una sola zona: un item con el total completo.
//   - Si hay varias zonas: el monto se reparte proporcional a las personas
//     que entran por cada puerta (no por horas). La última línea absorbe
//     el redondeo para que la suma cuadre con el total.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// createCheckoutSession(input, stripeClient)
// Crea una Checkout Session de Stripe para una reserva. Flujo:
//   1. Busca la reserva por ID con todos sus bloques e invitados.
//   2. Valida que la reserva exista y esté en pending_payment.
//   3. Valida que el monto enviado coincida con el total de la reserva
//      (el cliente no puede manipular el precio).
//   4. Valida que exista un hold activo y vigente (no expirado).
//   5. Crea la sesión de Stripe Checkout (modo payment, moneda COP,
//      line items por zona, URLs de éxito y cancelación).
//   6. Crea el Payment en BD (status: pending) idempotente por stripeSessionId
//      (upsert: si el cliente reintenta, no duplica el cobro).
//   7. Devuelve sessionId, checkoutUrl y paymentId.
// -----------------------------------------------------------------------------
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
      blocks: {
        orderBy: { startsAt: "asc" },
        select: {
          startsAt: true,
          endsAt: true,
          personas: true,
          service: { select: { name: true, category: { select: { name: true } } } },
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

// -----------------------------------------------------------------------------
// ConfirmacionPago (tipo)
// Resultado de liquidar un pago:
//   - transitioned: true → el pago pasó a succeeded y se emitieron QR.
//   - transitioned: false → no hubo cambio (ya estaba procesado).
// -----------------------------------------------------------------------------
export type ConfirmacionPago =
  | { transitioned: true; emitidos: QrEmitido[] }
  | { transitioned: false; emitidos: [] };

// -----------------------------------------------------------------------------
// PAGO_TARDIO_CODE
// Código usado cuando el pago llega después de que expiró el hold de 10 min.
// No se liquida ni se emiten QR; requiere revisión manual.
// -----------------------------------------------------------------------------
export const PAGO_TARDIO_CODE = "PAGO_TARDIO_REQUIERE_REVISION";

// -----------------------------------------------------------------------------
// confirmarPagoExitoso(input)
// Liquida un pago confirmado por Stripe. Flujo:
//   1. Busca el payment por ID. Si no existe, 404.
//   2. Si el pago ya no está pending, devuelve transitioned: false (idempotencia).
//   3. Verifica que la reserva siga en pending_payment y que el hold esté vigente.
//   4. Si el hold expiró (pago tardío), lanza 409 PAGO_TARDIO_CODE y registra
//      para revisión manual (reembolso o revivir fuera de la app).
//   5. Llama a settlePayment(): payment → succeeded, reserva → confirmed
//      (condicional por estado, idempotente).
//   6. Vuelve a verificar que la reserva quede confirmed (cierra carrera si el
//      hold expiró entre la verificación y la liquidación).
//   7. Llama a consumirHoldYTrasladarCupos(): hold → consumed, heldCount → bookedCount.
//   8. Emite los QRs (emitirQrDeReserva): un QR por persona y zona.
//   9. Envía el correo con los QR (entregarQrPorCorreo).
//      El correo se envía desde aquí y no solo del webhook, porque la reserva
//      puede liquidarse por más de una vía.
// -----------------------------------------------------------------------------
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

  // Cierra la carrera: el hold pudo expirar entre la verificación y la liquidación.
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
    // El pago ya quedó liquidado; exige revisión manual y reintento del webhook.
    throw new HttpError(500, "QR_SIN_EMITIR", emision.message);
  }

  // Los tokens crudos se consumen aquí: en la base solo quedan los hashes.
  await entregarQrPorCorreo(payment.reservationId, emision.emitidos);

  return { transitioned: true, emitidos: emision.emitidos };
}

// -----------------------------------------------------------------------------
// entregarQrPorCorreo(reservationId, emitidos)
// Envía los QR por correo al titular de la reserva.
//   - Intenta n8n primero (envía PDF adjunto).
//   - Si n8n no está configurado o falla, usa Resend directo.
//   - Nunca lanza: el pago ya está liquidado. Los errores se registran para
//     revisión manual.
// -----------------------------------------------------------------------------
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
        documento: contacto.documento,
      });
    }
  } catch (error) {
    logger.error("pago.qr_email_fallido", { reservationId, error });
  }
}

// -----------------------------------------------------------------------------
// enviarPdfPorN8n(input)
// Genera el PDF de los QR y se lo envía a n8n para que lo entregue por correo.
// Devuelve true si n8n lo aceptó, false para aplicar plan B (Resend).
// -----------------------------------------------------------------------------
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
      // El token crudo viaja en el evento porque es lo que hay que dibujar en el QR del PDF.
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

// -----------------------------------------------------------------------------
// rechazarPago(input)
// Marca el pago como fallido, libera los cupos retenidos y notifica al cliente.
//   - rejectPayment(): payment → failed, reserva → payment_rejected (condicional).
//   - liberarCuposDeReserva(): devuelve heldCount al inventario.
//   - notificarPagoRechazado(): envía correo al cliente.
// -----------------------------------------------------------------------------
export async function rechazarPago(input: { paymentId: string; reason?: string | null }) {
  const payment = await rejectPayment({ paymentId: input.paymentId, reason: input.reason });
  await liberarCuposDeReserva(payment.reservationId);
  await notificarPagoRechazado(payment.reservationId, input.reason);
  return payment;
}

// -----------------------------------------------------------------------------
// notificarPagoRechazado(reservationId, motivo)
// Envía correo de pago rechazado por Resend directo (no hay workflow en n8n
// para este evento). Nunca lanza.
// -----------------------------------------------------------------------------
async function notificarPagoRechazado(reservationId: string, motivo?: string | null): Promise<void> {
  try {
    const contacto = await obtenerContactoAviso(reservationId);
    if (!contacto) return;
    await sendPagoRechazadoEmail(contacto.email, {
      nombre: contacto.nombre,
      fecha: contacto.startsAt.toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      servicio: contacto.servicio,
      montoCop: contacto.totalCop,
      motivo,
    });
  } catch (error) {
    logger.error("pago.rechazo_email_fallido", { reservationId, error });
  }
}

// -----------------------------------------------------------------------------
// appUrl()
// Devuelve la URL pública de la app (NEXT_PUBLIC_APP_URL).
// -----------------------------------------------------------------------------
export function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL;
}

// -----------------------------------------------------------------------------
// getCheckoutSession(sessionId, stripeClient)
// Consulta una Checkout Session ya abierta en Stripe.
// Se usa en la página /pagando/[id] para no crear una sesión nueva cada vez
// que el cliente recarga. Si Stripe no la conoce, devuelve null.
// -----------------------------------------------------------------------------
export async function getCheckoutSession(
  sessionId: string,
  stripeClient: StripeCheckoutClient = getStripe(),
): Promise<{ status: string; url: string | null } | null> {
  try {
    const sesion = await stripeClient.checkout.sessions.retrieve(sessionId);
    return { status: sesion.status ?? "unknown", url: sesion.url ?? null };
  } catch {
    return null;
  }
}
