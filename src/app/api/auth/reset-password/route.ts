import { NextResponse } from "next/server";
import { z } from "zod";
import { completePasswordReset } from "@/features/auth/email-flow.service";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";

const schema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(100),
});

export const POST = handler(async (req) => {
  const result = schema.safeParse(await req.json());
  if (!result.success) throw new ValidationError("El token o la nueva contraseña no son válidos");
  await completePasswordReset(result.data.token, result.data.password);
  return NextResponse.json(ok(null));
});
