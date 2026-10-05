import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { fail } from "@/shared/http/api-response";

// Recuperación de contraseña aún no implementada (no hay proveedor de correo).
export const POST = handler(async () => {
  return NextResponse.json(
    fail(
      "NOT_IMPLEMENTED",
      "La recuperación de contraseña aún no está disponible. Contáctanos por nuestros canales de atención.",
    ),
    { status: 501 },
  );
});
