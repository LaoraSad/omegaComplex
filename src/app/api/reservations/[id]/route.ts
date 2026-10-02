import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev3): detalle/cancelar reserva.
export const GET = handler(async () => {
  return NextResponse.json(ok({ todo: "get-reservation" }));
});

export const DELETE = handler(async () => {
  return NextResponse.json(ok({ todo: "cancel-reservation" }));
});
