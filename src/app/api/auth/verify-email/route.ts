import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailCode } from "@/features/auth/email-flow.service";
import { normalizeEmail } from "@/features/auth/auth.repository";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

const schema = z.object({
  email: z.string().trim().email().max(255),
  code: z.string().regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
});

export const POST = handler(async (req) => {
  const result = schema.safeParse(await req.json());
  if (!result.success) throw new ValidationError("Ingresa un correo y un código de 6 dígitos válidos");
  await verifyEmailCode(normalizeEmail(result.data.email), result.data.code);
  return NextResponse.json(ok({ message: "Correo verificado correctamente" }));
});