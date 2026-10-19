// -----------------------------------------------------------------------------
// src/app/api/auth/logout/route.ts
// Endpoint POST /api/auth/logout
// Cierre de sesión: invalida la cookie de sesión.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { deleteSession } from "@/shared/auth/session";

// -----------------------------------------------------------------------------
// POST /api/auth/logout
// Flujo:
//   1. Llama a deleteSession() que elimina la cookie HttpOnly "session".
//   2. Devuelve 200 con { loggedOut: true }.
//   - El cliente también debe borrar el token de sessionStorage (se hace en
//     src/lib/api/auth.ts logout()).
// -----------------------------------------------------------------------------
export const POST = handler(async () => {
  await deleteSession();
  return NextResponse.json(ok({ loggedOut: true }));
});
