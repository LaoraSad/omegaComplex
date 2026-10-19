// -----------------------------------------------------------------------------
// src/shared/http/handler.ts
// Wrapper centralizado de errores para Route Handlers de Next.js.
// Todos los endpoints (route.ts) deben envolver su función con handler()
// para que los errores se conviertan en respuestas HTTP con formato uniforme.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { HttpError } from "./errors";
import { fail } from "./api-response";
import { logger } from "@/shared/lib/logger";

// -----------------------------------------------------------------------------
// handler(fn)
// Recibe una función asíncrona del route handler y devuelve una función envuelta
// que captura cualquier excepción y la traduce a una respuesta HTTP adecuada.
// Flujo:
//   1. Ejecuta la función original fn(req, ctx).
//   2. Si fn lanza una instancia de HttpError (error tipado del dominio):
//        - Devuelve JSON con fail(code, message) y el status HTTP correspondiente
//          (400, 401, 403, 404, 409, 503, etc.).
//   3. Si fn lanza cualquier otro error no controlado:
//        - Lo registra en consola y en el logger para depuración.
//        - Devuelve un error genérico 500 INTERNAL_ERROR sin exponer detalles
//          técnicos al cliente (seguridad).
// Uso típico:
//   export const POST = handler(async (req) => {
//     ... lógica ...
//     return NextResponse.json(ok(data));
//   });
// -----------------------------------------------------------------------------
export function handler(
  fn: (req: NextRequest, ctx?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse>,
) {
  return async (
    req: NextRequest,
    ctx?: { params?: Promise<Record<string, string>> },
  ) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json(fail(err.code, err.message), {
          status: err.status,
        });
      }
      console.error("[api] unhandled error", err);
      logger.error("api.unhandled", { url: req.url, err });
      return NextResponse.json(fail("INTERNAL_ERROR", "Error interno"), {
        status: 500,
      });
    }
  };
}
