// Estado del pago: consulta a Stripe si es necesario.
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/shared/lib/db";
import { getStripe } from "@/shared/lib/stripe";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { NotFoundError, UnauthorizedError, HttpError } from "@/shared/http/errors";
import { getSession } from "@/shared/auth/session";
import { getPaymentBySessionId } from "@/features/payments/payments.repository";
import { confirmarPagoExitoso, PAGO_TARDIO_CODE } from "@/features/payments/payments.service";

/**
 * Estado del pago de una reserva, para la pantalla de espera.
 *
 * Consultar solo nuestra base no alcanza: entre que el cliente paga en Stripe y
 * que llega el webhook, la fila sigue en `pending`. Esa ventana es justamente
 * donde se espera, asi que para no mostrar un falso error se le pregunta
 * tambien a Stripe, que es la fuente de verdad del cobro.
 *
 * De paso recupera pagos huerfanos: si el webhook nunca llego pero Stripe
 * confirma el cobro, se liquida aqui. Es idempotente, asi que si el webhook
 * llega despues no hace nada la segunda vez.
 */
export const GET = handler(
  async (_req: NextRequest, ctx?: { params?: Promise<Record<string, string>> }) => {
    const session = await getSession();
    if (!session) throw new UnauthorizedError("No autenticado");

    const { id } = (await (ctx?.params ?? Promise.resolve({}))) as { id?: string };
    if (!id) throw new NotFoundError("Reserva no encontrada");

    const pago = await db.payment.findFirst({
      where: {
        reservationId: id,
        reservation: { customer: { userId: session.userId } },
      },
      select: { status: true, stripeSessionId: true },
      orderBy: { createdAt: "desc" },
    });

    if (!pago?.stripeSessionId) throw new NotFoundError("Esta reserva no tiene pagos");

    // Si nuestra base ya lo sabe, no hay nada que preguntarle a Stripe.
    if (pago.status === "succeeded") {
      return NextResponse.json(ok({ estado: "confirmado", qrDisponibles: true }));
    }

    let pagoCompletadoEnStripe = false;
    let intentId: string | null = null;
    let consultoStripe = false;

    try {
      const sesion = await getStripe().checkout.sessions.retrieve(pago.stripeSessionId);
      consultoStripe = true;
      pagoCompletadoEnStripe = sesion.payment_status === "paid";
      intentId = typeof sesion.payment_intent === "string" ? sesion.payment_intent : null;
    } catch {
      // Si Stripe no responde se devuelve el estado local: es peor mostrar un
      // error cuando el pago si salio que tardar unos segundos mas.
    }

    if (pagoCompletadoEnStripe && intentId) {
      const record = await getPaymentBySessionId(pago.stripeSessionId);

      if (record && record.status === "pending") {
        try {
          const r = await confirmarPagoExitoso({
            paymentId: record.id,
            stripePaymentIntentId: intentId,
          });

          return NextResponse.json(
            ok({
              estado: r.transitioned ? "confirmado" : "procesando",
              qrDisponibles: r.transitioned,
              recuperado: r.transitioned,
            }),
          );
        } catch (error) {
          // Pago tardío: decir "procesando" sería mentira, el hold ya expiró.
          if (error instanceof HttpError && error.code === PAGO_TARDIO_CODE) {
            return NextResponse.json(
              ok({ estado: "requiere-revision", qrDisponibles: false }),
            );
          }
          // El pago esta cobrado pero algo del lado nuestro fallo. Se dice
          // explicitamente para que la pagina no prometa QR que no hay.
          return NextResponse.json(
            ok({
              estado: "procesando",
              qrDisponibles: false,
              recuperado: false,
              recuperacion: "requiere-reintento",
            }),
          );
        }
      }
    }

    return NextResponse.json(
      ok({
        estado: pago.status === "failed" ? "fallido" : "procesando",
        qrDisponibles: false,
        consultadoEnStripe: consultoStripe,
      }),
    );
  },
);