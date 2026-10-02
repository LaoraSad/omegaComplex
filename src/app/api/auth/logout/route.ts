import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev1): invalidar sesión.
export const POST = handler(async () => {
  return NextResponse.json(ok({ todo: "logout" }));
});
