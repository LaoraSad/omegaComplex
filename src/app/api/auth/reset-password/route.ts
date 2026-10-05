import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { fail } from "@/shared/http/api-response";

// Restablecimiento de contraseña aún no implementado (no hay proveedor de correo).
export const POST = handler(async () => {
  return NextResponse.json(
    fail(
      "NOT_IMPLEMENTED",
      "El restablecimiento de contraseña aún no está disponible. Contáctanos por nuestros canales de atención.",
    ),
    { status: 501 },
  );
});
