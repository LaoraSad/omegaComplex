// Registro: crea User + Customer y emite verificación.
import { NextRequest, NextResponse } from "next/server";

import { registerSchema } from "@/features/auth/auth.schemas";
import { register } from "@/features/auth/auth.service";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";
import { createSession } from "@/shared/auth/session";

export const POST = handler(async (req: NextRequest) => {
  const body = await req.json();

  const result = registerSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Datos de registro inválidos");
  }

  const user = await register(result.data);
  const token = await createSession(user.id, user.role as "user" | "admin" | "employee");

  return NextResponse.json(ok({ ...user, token }), {
    status: 201,
  });
});
