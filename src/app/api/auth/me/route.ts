// -----------------------------------------------------------------------------
// src/app/api/auth/me/route.ts
// Endpoint GET /api/auth/me y PATCH /api/auth/me
// Obtiene y actualiza el perfil del usuario autenticado.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { UnauthorizedError, ValidationError } from "@/shared/http/errors";
import { getSession, deleteSession } from "@/shared/auth/session";
import { cargarUsuarioDeSesion } from "@/shared/auth/session-user";
import { updateProfileSchema } from "@/features/auth/auth.schemas";
import { updateProfile } from "@/features/auth/auth.service";

// -----------------------------------------------------------------------------
// GET /api/auth/me
// Devuelve el usuario actual a partir de la sesión.
//   1. Obtiene la sesión con getSession() (lee cookie o header Authorization).
//   2. Si no hay sesión, lanza 401 UnauthorizedError.
//   3. Carga los datos del usuario con cargarUsuarioDeSesion() (usa cache de React
//      por request para no consultar la BD varias veces en la misma navegación).
//   4. Devuelve 200 con los datos del usuario.
// -----------------------------------------------------------------------------
export const GET = handler(async () => {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError("No autenticado");
  }

  const user = await cargarUsuarioDeSesion(session.userId);

  if (!user) {
    throw new UnauthorizedError("No autenticado");
  }

  return NextResponse.json(ok(user), { status: 200 });
});

// -----------------------------------------------------------------------------
// PATCH /api/auth/me
// Actualiza teléfono y/o correo del perfil del usuario autenticado.
//   1. Verifica sesión (401 si no hay).
//   2. Valida el body con updateProfileSchema (Zod strict: solo teléfono y correo).
//   3. Llama a auth.service.updateProfile():
//        - Teléfono: actualización directa.
//        - Correo: si cambia, normaliza, verifica colisión, actualiza en BD,
//          pone emailVerified = false e incrementa tokenVersion (revoca sesiones).
//   4. Si el correo cambió, se borra la sesión (deleteSession) para forzar
//      re-login y re-verificación inmediata.
//   5. Devuelve 200 con el resultado.
// -----------------------------------------------------------------------------
export const PATCH = handler(async (req) => {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Debes iniciar sesión para editar tu perfil");
  }

  const parsed = updateProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
  }

  const result = await updateProfile(session.userId, parsed.data);

  if (result.emailChanged) {
    await deleteSession();
  }

  return NextResponse.json(ok(result), { status: 200 });
});
