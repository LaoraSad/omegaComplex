import { NextRequest, NextResponse } from "next/server";

// Protección de rutas por sesión.
// TODO: redirigir a /login si no hay sesión; restringir dashboard/validar por rol.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/reservas/:path*", "/validar/:path*"],
};
