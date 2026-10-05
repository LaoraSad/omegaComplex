import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { fail } from "@/shared/http/api-response";

// Verificación por correo aún no implementada: el registro deja sesión activa
// inmediata y no bloquea el acceso.
export const POST = handler(async () => {
  return NextResponse.json(
    fail(
      "NOT_IMPLEMENTED",
      "La verificación por correo aún no está disponible. Tu cuenta ya está activa y puedes iniciar sesión.",
    ),
    { status: 501 },
  );
});
