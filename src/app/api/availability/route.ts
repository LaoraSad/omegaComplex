import { NextResponse } from "next/server";

import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import {
  dayAvailabilitySchema,
  firstIssue,
  rangeAvailabilitySchema,
} from "@/features/availability/availability.schemas";
import {
  getDayAvailability,
  getSlotsInRange,
} from "@/features/availability/availability.repository";

// Disponibilidad real. Antes devolvía siempre [] o franjas fijas inventadas.
/*
 * GET /api/availability?serviceId=<uuid>&fecha=AAAA-MM-DD
 * GET /api/availability?serviceId=<uuid>&desde=AAAA-MM-DD&hasta=AAAA-MM-DD
 */
export const GET = handler(async (req) => {
  const params = new URL(req.url).searchParams;

  const porDia = dayAvailabilitySchema.safeParse({
    serviceId: params.get("serviceId"),
    fecha: params.get("fecha"),
  });
  if (porDia.success) {
    return NextResponse.json(ok(await getDayAvailability(porDia.data.serviceId, porDia.data.fecha)));
  }

  const porRango = rangeAvailabilitySchema.safeParse({
    serviceId: params.get("serviceId"),
    desde: params.get("desde"),
    hasta: params.get("hasta"),
  });
  if (porRango.success) {
    return NextResponse.json(
      ok({
        slots: await getSlotsInRange(
          porRango.data.serviceId,
          porRango.data.desde,
          porRango.data.hasta,
        ),
      }),
    );
  }

  throw new ValidationError(
    firstIssue(porDia.error) === "Revisa los datos ingresados."
      ? firstIssue(porRango.error)
      : firstIssue(porDia.error),
  );
});