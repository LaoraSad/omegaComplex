import { NextResponse } from "next/server";

import { availabilityQuerySchema } from "@/features/availability/availability.schemas";
import { getAvailability } from "@/features/availability/availability.service";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

// Consulta pública: el calendario de disponibilidad se puede ver sin sesión.
// Los query params llegan como texto plano, por eso se parsean con Zod.
export const GET = handler(async (req) => {
  const result = availabilityQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  if (!result.success) {
    throw new ValidationError(
      "Se requiere serviceId (UUID) y date (AAAA-MM-DD) en la consulta",
    );
  }

  const availability = await getAvailability(result.data);

  return NextResponse.json(ok(availability), { status: 200 });
});