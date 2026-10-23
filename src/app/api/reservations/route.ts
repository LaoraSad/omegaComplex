import { NextResponse } from "next/server";

import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { getSession } from "@/shared/auth/session";
import { createReservationSchema, firstIssue } from "@/features/reservations/reservations.schemas";
import { createReservationWithHold } from "@/features/reservations/reservations.service";
import { listCustomerReservations } from "@/features/reservations/reservations.repository";

// ---------------------------------------------------------------------------
// Reservas del cliente (SCRUM sección 9).
//
// POST crea la reserva y deja la franja bloqueada 10 minutos mientras el
// cliente paga. Lo que sigue (cobrar con Stripe, emitir los QR y mandarlos por
// correo) lo implementa el equipo; aquí la reserva queda en pending_payment.
// ---------------------------------------------------------------------------

export const GET = handler(async () => {
  const session = await getSession();
  if (!session) return NextResponse.json(ok([]));

  const rows = await listCustomerReservations(session.userId);
  return NextResponse.json(
    ok(
      rows.map((r) => ({
        id: r.id,
        status: r.status,
        serviceId: r.serviceId,
        serviceName: r.service.name,
        categoryName: r.service.category.name,
        personas: r.quantity,
        totalCop: r.totalCop,
        inicia: r.startsAt,
        termina: r.endsAt,
        createdAt: r.createdAt,
      })),
    ),
  );
});

export const POST = handler(async (req) => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Debes iniciar sesión para reservar." } },
      { status: 401 },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));

  const result = await createReservationWithHold(session.userId, parsed.data);

  if (!result.ok) {
    // 409 = la franja ya no está disponible o se solapa con otra reserva del
    // mismo cliente; el modal refresca y vuelve a pintar los cupos.
    const solapa = result.code === "horario_chocante" || result.code === "bloques_pisados";
    const status =
      result.code === "sin_cupos" ||
      result.code === "ya_reservado" ||
      result.code === "bloque_repetido" ||
      solapa
        ? 409
        : 400;
    return NextResponse.json({ data: null, error: { code: result.code, message: result.message } }, { status });
  }

  return NextResponse.json(
    ok({
      reservationId: result.reservationId,
      holdId: result.holdId,
      expiraEn: result.expiresAt,
      totalCop: result.totalCop,
      personas: result.personas,
      // Cuantas zonas abarque la compra: la UI avisa cuántos QR recibirá cada
      // persona (uno por puerta).
      zonas: result.zonas,
      cuposRestantes: result.cuposRestantes,
      // Recordatorio para el equipo: el PDF sale de ReservationBlock x
      // ReservationGuest, un QR por persona y por zona.
      siguientePaso: "Emitir un QR por persona y zona, y enviarlos al correo.",
    }),
    { status: 201 },
  );
});