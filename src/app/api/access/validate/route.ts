import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev3): validar QR + control de ingreso (access).
export const POST = handler(async () => {
  return NextResponse.json(ok({ valid: false, todo: "validate-qr" }));
});
