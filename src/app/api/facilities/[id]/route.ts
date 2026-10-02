import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev2): detalle/actualizar/eliminar instalación.
export const GET = handler(async () => {
  return NextResponse.json(ok({ todo: "get-facility" }));
});

export const PATCH = handler(async () => {
  return NextResponse.json(ok({ todo: "update-facility" }));
});

export const DELETE = handler(async () => {
  return NextResponse.json(ok({ todo: "delete-facility" }));
});
