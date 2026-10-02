import { NextRequest, NextResponse } from "next/server";
import { HttpError } from "./errors";
import { fail } from "./api-response";

// Wrapper con manejo centralizado de errores (T6).
// Uso: export const POST = handler(async (req) => { ... return NextResponse.json(ok(data)); });
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
      return NextResponse.json(fail("INTERNAL_ERROR", "Error interno"), {
        status: 500,
      });
    }
  };
}
