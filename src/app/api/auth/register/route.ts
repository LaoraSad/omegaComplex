import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev1): implementar registro con auth.service + auth.schemas.
export const POST = handler(async () => {
  return NextResponse.json(ok({ todo: "register" }), { status: 201 });
});
