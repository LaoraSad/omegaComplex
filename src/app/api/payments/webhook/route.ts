import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev3): webhook de Stripe (verificar firma con STRIPE_WEBHOOK_SECRET).
export const POST = handler(async () => {
  return NextResponse.json(ok({ received: true }));
});
