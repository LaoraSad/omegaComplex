// -----------------------------------------------------------------------------
// src/app/api/auth/login/route.ts
// Endpoint POST /api/auth/login
// Inicio de sesión con rate limit y verificación de correo.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

import { loginSchema } from "@/features/auth/auth.schemas";
import { login } from "@/features/auth/auth.service";
import { ipDesdeHeaders } from "@/features/auth/login-rate-limit";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";
import { createSession } from "@/shared/auth/session";

// -----------------------------------------------------------------------------
// POST /api/auth/login
// Flujo:
//   1. Lee el cuerpo JSON de la petición.
//   2. Valida los datos con loginSchema (Zod). Si falla, lanza ValidationError (400).
//   3. Llama a auth.service.login() pasando el IP extraído de las cabeceras.
//      - Dentro del servicio se aplica rate limiting, verificación de credenciales,
//        puerta de verificación de correo y creación de sesión JWT.
//   4. createSession() genera el JWT y lo guarda en la cookie HttpOnly "session".
//   5. Devuelve 200 con los datos del usuario y el token (el cliente guarda el
//      token en sessionStorage para futuras peticiones a la API de auth).
// -----------------------------------------------------------------------------
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
