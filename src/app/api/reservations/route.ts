import { NextResponse } from "next/server";

import { createReservationSchema } from "@/features/reservations/reservations.schemas";
import {
  createReservation,
  listMyReservations,
} from "@/features/reservations/reservations.service";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

// RES-02: lista solo las reservas del cliente autenticado.
export const GET = handler(async () => {
  const reservations = await listMyReservations();

  return NextResponse.json(ok(reservations), { status: 200 });
});

// RES-01: crea una reserva online con hold temporal sobre la franja.
export const POST = handler(async (req) => {
  // Un body que no es JSON válido es un error del cliente (400), no un 500.
  const rawBody = await req.json().catch(() => {
    throw new ValidationError("El cuerpo de la solicitud debe ser JSON válido");
  });

  const result = createReservationSchema.safeParse(rawBody);

  if (!result.success) {
    throw new ValidationError(
      "Se requiere serviceId (UUID), slotId (UUID) y quantity (entero >= 1)",
    );
  }

  const reservation = await createReservation(result.data);

  return NextResponse.json(ok(reservation), { status: 201 });
});