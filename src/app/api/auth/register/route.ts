// -----------------------------------------------------------------------------
// src/app/api/auth/register/route.ts
// Endpoint POST /api/auth/register
// Registro: crea User + Customer y emite verificación de correo.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

import { registerSchema } from "@/features/auth/auth.schemas";
import { register } from "@/features/auth/auth.service";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";
import { createSession } from "@/shared/auth/session";

// -----------------------------------------------------------------------------
// POST /api/auth/register
// Flujo:
//   1. Lee el cuerpo JSON de la petición.
//   2. Valida los datos con registerSchema (Zod). Si falla, lanza ValidationError (400).
//   3. Llama a auth.service.register() que:
//        - Verifica que el email y documento no existan.
//        - Asigna el rol "user" (debe existir en BD, de lo contrario falla con 500).
//        - Hashea la contraseña con bcrypt.
//        - Crea User y Customer en una transacción de Prisma (emailVerified = false).
//        - Envía código de verificación por correo.
//        - Notifica a n8n del registro.
//   4. createSession() genera el JWT y lo guarda en la cookie HttpOnly "session".
//   5. Devuelve 201 con los datos del usuario y el token.
// -----------------------------------------------------------------------------
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
