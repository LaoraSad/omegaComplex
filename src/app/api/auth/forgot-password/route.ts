import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/features/auth/email-flow.service";
import { normalizeEmail } from "@/features/auth/auth.repository";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";

const schema = z.object({ email: z.string().trim().email().max(255) });

export const POST = handler(async (req) => {
  const result = schema.safeParse(await req.json());
  if (!result.success) throw new ValidationError("Ingresa un correo electrónico válido");
  await requestPasswordReset(normalizeEmail(result.data.email));
  return NextResponse.json(ok({
    message: "Si existe una cuenta para ese correo, recibirás instrucciones para continuar.",
  }));
});
