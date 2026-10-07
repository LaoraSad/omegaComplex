import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/auth/session";

import { createReservationSchema, listReservationsQuerySchema } from "@/features/reservations/reservations.schemas";
import { createReservation, getAvailability, getMyReservations, getReservationDetail } from "@/features/reservations/reservations.service";
import { ok, fail } from "@/shared/http/api-response";
import { ValidationError, UnauthorizedError, NotFoundError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

export const POST = handler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Sesión requerida");
  }

  const body = await req.json();
  const result = createReservationSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Datos de reserva inválidos");
  }

  const customer = await db.customer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  if (!customer) {
    throw new NotFoundError("Perfil de cliente no encontrado");
  }

  const reservation = await createReservation(session.userId, customer.id, result.data);

  return NextResponse.json(ok(reservation), { status: 201 });
});

export const GET = handler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Sesión requerida");
  }

  const { searchParams } = req.nextUrl;
  const reservationId = searchParams.get("id");

  if (reservationId) {
    const reservation = await getReservationDetail(reservationId);
    if (reservation.customer.userId !== session.userId) {
      throw new UnauthorizedError("No autorizado para ver esta reserva");
    }
    return NextResponse.json(ok(reservation));
  }

  const query = listReservationsQuerySchema.parse(Object.fromEntries(searchParams));
  const customer = await db.customer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  if (!customer) {
    return NextResponse.json(ok({ rows: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }));
  }

  const reservations = await getMyReservations(customer.id);
  return NextResponse.json(ok(reservations));
});

import { db } from "@/shared/lib/db";