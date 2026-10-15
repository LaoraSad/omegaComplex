// Inicio de sesión con rate limit y verificación de correo.
import { NextRequest, NextResponse } from "next/server";

import { loginSchema } from "@/features/auth/auth.schemas";
import { login } from "@/features/auth/auth.service";
import { ipDesdeHeaders } from "@/features/auth/login-rate-limit";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";
import { createSession } from "@/shared/auth/session";

export const POST = handler(async (req: NextRequest) => {
  const body = await req.json();

  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Datos de login inválidos");
  }

  const user = await login(result.data, ipDesdeHeaders(req.headers));
  const token = await createSession(user.id, user.role as "user" | "admin" | "employee");

  return NextResponse.json(ok({ ...user, token }), {
    status: 200,
  });
});
