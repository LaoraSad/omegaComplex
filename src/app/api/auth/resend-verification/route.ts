import { NextResponse } from "next/server";
import { z } from "zod";
import { resendVerificationCode } from "@/features/auth/email-flow.service";
import { normalizeEmail } from "@/features/auth/auth.repository";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";

const schema = z.object({ email: z.string().trim().email().max(255) });

export const POST = handler(async (req) => {
  const result = schema.safeParse(await req.json());
  if (!result.success) throw new ValidationError("Ingresa un correo electrónico válido");
  await resendVerificationCode(normalizeEmail(result.data.email));
  return NextResponse.json(ok({ message: "Si la cuenta necesita verificación, enviaremos un nuevo código." }));
});
