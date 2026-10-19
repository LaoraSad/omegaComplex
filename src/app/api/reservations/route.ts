// -----------------------------------------------------------------------------
// src/app/api/reservations/route.ts
// Endpoint GET /api/reservations y POST /api/reservations
// Lista y crea reservas con bloqueo temporal (hold).
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";

import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { getSession } from "@/shared/auth/session";
import { createReservationSchema, firstIssue } from "@/features/reservations/reservations.schemas";
import { createReservationWithHold } from "@/features/reservations/reservations.service";
import { listCustomerReservations } from "@/features/reservations/reservations.repository";

// -----------------------------------------------------------------------------
// Reservas del cliente (SCRUM sección 9).
//
// POST crea la reserva y deja la franja bloqueada 10 minutos mientras el
// cliente paga. Lo que sigue (cobrar con Stripe, emitir los QR y mandarlos por
// correo) se implementa en el módulo de pagos; aquí la reserva queda en
// pending_payment.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// GET /api/reservations
// Lista las reservas del cliente autenticado.
//   1. Obtiene la sesión (getSession). Si no hay, devuelve array vacío (200).
//   2. Llama a listCustomerReservations() para obtener las reservas del cliente.
//   3. Mapea cada reserva a un formato simplificado para la UI.
//   4. Devuelve 200 con la lista.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// POST /api/reservations
// Crea una nueva reserva con bloqueo temporal.
//   1. Obtiene la sesión. Si no hay, devuelve 401.
//   2. Lee y valida el body con createReservationSchema (Zod).
//   3. Llama a createReservationWithHold() que:
//        - Valida fechas, mantenimiento, anticipación máxima (3 meses).
//        - Valida capacidad por franja (UPDATE condicional en BD).
//        - Valida solape con otras reservas del cliente.
//        - Crea Reservation (pending_payment), ReservationBlock, ReservationSlot,
//          ReservationGuest, ReservationHold (10 min) en una transacción.
//   4. Si el resultado no es ok:
//        - Códigos de conflicto (sin_cupos, ya_reservado, bloque_repetido,
//          horario_chocante, bloques_pisados) → 409.
//        - Otros errores → 400.
//   5. Si es ok, devuelve 201 con reservationId, holdId, expiraEn, totalCop,
//      personas, zonas y cuposRestantes.
// -----------------------------------------------------------------------------
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
      zonas: result.zonas,
      cuposRestantes: result.cuposRestantes,
      siguientePaso: "Emitir un QR por persona y zona, y enviarlos al correo.",
    }),
    { status: 201 },
  );
});
