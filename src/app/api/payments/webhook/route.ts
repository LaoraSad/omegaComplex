import { NextRequest, NextResponse } from "next/server";

import { handleStripeWebhook } from "@/features/payments/payments.service";
import { ok } from "@/shared/http/api-response";
import { HttpError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

export const POST = handler(async (req: NextRequest) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    throw new HttpError(400, "MISSING_SIGNATURE", "Falta cabecera stripe-signature");
  }

  const payload = await req.text();
  const result = await handleStripeWebhook(payload, signature);

  return NextResponse.json(ok(result));
});