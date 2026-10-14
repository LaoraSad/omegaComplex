// Usuario actual a partir de la sesión.
import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { UnauthorizedError, ValidationError } from "@/shared/http/errors";
import { getSession, deleteSession } from "@/shared/auth/session";
import { cargarUsuarioDeSesion } from "@/shared/auth/session-user";
import { updateProfileSchema } from "@/features/auth/auth.schemas";
import { updateProfile } from "@/features/auth/auth.service";

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

  // Al cambiar el correo se cierran las sesiones (tokenVersion++).
  // Se borra la cookie aquí para forzar el re-login + verificación inmediata.
  if (result.emailChanged) {
    await deleteSession();
  }

  return NextResponse.json(ok(result), { status: 200 });
});
