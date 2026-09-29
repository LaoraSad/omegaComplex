import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev2): consultar disponibilidad (schedules + availability).
export const GET = handler(async () => {
  return NextResponse.json(ok([]));
});
