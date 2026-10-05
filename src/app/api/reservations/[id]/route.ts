import { NextResponse } from "next/server";

import { getMyReservationById } from "@/features/reservations/reservations.service";
import { ok } from "@/shared/http/api-response";
import { handler } from "@/shared/http/handler";

// RES-03: detalle de una reserva propia.
// En Next 16 `params` es una Promise y hay que esperarla.
export const GET = handler(async (_req, ctx) => {
  const { id } = (await ctx?.params) ?? {};

  const reservation = await getMyReservationById(id ?? "");

  return NextResponse.json(ok(reservation), { status: 200 });
});

// TODO(Dev3): cancelar reserva (liberar hold y cupo). Fuera del alcance de RES-01..RES-03.
export const DELETE = handler(async () => {
  return NextResponse.json(ok({ todo: "cancel-reservation" }));
});