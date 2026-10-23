// -----------------------------------------------------------------------------
// src/proxy.ts
// Middleware de Next.js (App Router). Protege rutas por rol de usuario usando
// el JWT almacenado en la cookie HttpOnly "session".
// Se ejecuta en el edge antes de que la petición llegue a la página o API.
// Configuración: matcher define qué rutas pasan por este middleware.
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Nombre de la cookie de sesión (debe coincidir con src/shared/auth/session.ts).
const SESSION_COOKIE = "session";

// Roles válidos de la aplicación.
type Role = "user" | "admin" | "employee";

// -----------------------------------------------------------------------------
// getRoleFromToken(token)
// Verifica la firma del JWT con jose y extrae el role.
//   - Si JWT_SECRET no está configurado, devuelve null.
//   - Si el token es inválido o expirado (jwtVerify lanza), devuelve null.
//   - Si el role no es uno de los tres válidos, devuelve null.
// Devuelve el role o null.
// -----------------------------------------------------------------------------
async function getRoleFromToken(token: string): Promise<Role | null> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = String(payload.role);

    if (role === "user" || role === "admin" || role === "employee") {
      return role;
    }

    return null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// loginRedirect(req)
// Redirige al usuario a /login guardando en el query param "next" la URL
// original que intentó visitar, para redirigir de vuelta tras autenticarse.
// -----------------------------------------------------------------------------
function loginRedirect(req: NextRequest) {
  const url = new URL("/login", req.url);
  const next = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

// -----------------------------------------------------------------------------
// proxy(req)
// Función principal del middleware. Flujo:
//   1. Lee la ruta (pathname) de la petición.
//   2. Intenta leer la cookie "session" (JWT).
//   3. Si no hay cookie → redirige a /login?next=<ruta original>.
//   4. Verifica el token con getRoleFromToken().
//   5. Si el token es inválido → redirige a /login.
//   6. Aplica reglas de autorización por ruta:
//        /admin*                 → solo rol "admin"
//        /dashboard*             → solo rol "admin" (panel legacy)
//        /piscinas/dashboard*    → solo rol "admin"
//        /validar*               → roles "admin" o "employee"
//        /reservas*              → cualquier rol con sesión válida
//   7. Si no cumple la regla de su ruta → redirige a "/" (inicio).
//   8. Si cumple todo → NextResponse.next() (deja continuar a la página/API).
// -----------------------------------------------------------------------------
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return loginRedirect(req);
  }

  const role = await getRoleFromToken(token);

  if (!role) {
    return loginRedirect(req);
  }

  // /admin solo para administradores.
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Panel legacy de desarrollo: protegido para admins.
  if (pathname.startsWith("/dashboard") && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // /piscinas/dashboard solo para administradores.
  if (pathname.startsWith("/piscinas/dashboard") && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // /validar solo para admin o employee (control de acceso en puerta).
  if (
    pathname.startsWith("/validar") &&
    role !== "admin" &&
    role !== "employee"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // /reservas requiere solo sesión válida, cualquier rol puede entrar.
  return NextResponse.next();
}

// -----------------------------------------------------------------------------
// config.matcher
// Rutas que pasarán por este middleware. Cada cambio aquí debe reflejarse en
// la lógica de proxy().
// -----------------------------------------------------------------------------
export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/piscinas/dashboard/:path*",
    "/reservas/:path*",
    "/validar/:path*",
  ],
};
