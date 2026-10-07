import { NextRequest, NextResponse } from "next/server";

import { getAvailability } from "@/features/reservations/reservations.service";
import { ok, fail } from "@/shared/http/api-response";
import { ValidationError, NotFoundError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

export const GET = handler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!serviceId || !date) {
    throw new ValidationError("serviceId y date son requeridos");
  }

  const availability = await getAvailability(serviceId, date);
  return NextResponse.json(ok(availability));
});