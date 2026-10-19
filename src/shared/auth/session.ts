// -----------------------------------------------------------------------------
// src/shared/auth/session.ts
// Lectura, creación y eliminación de la sesión de usuario.
// Soporta Authorization header (sessionStorage enviado desde el cliente) y
// cookie HttpOnly "session" (usada por el middleware proxy.ts y por el servidor).
// -----------------------------------------------------------------------------

import { cookies, headers } from "next/headers";

import { db } from "@/shared/lib/db";
import { verifyToken, createToken } from "./jwt";

// -----------------------------------------------------------------------------
// Tipo Session: representa la sesión activa de un usuario autenticado.
// userId: identificador del usuario en la base de datos.
// role: rol del usuario ("user", "admin" o "employee").
// null: no hay sesión activa.
// -----------------------------------------------------------------------------
export type Session = {
  userId: string;
  role: "user" | "admin" | "employee";
} | null;

// Nombre de la cookie que almacena el JWT de sesión. Debe coincidir con el
// leído en src/proxy.ts (middleware) y en src/lib/api/auth.ts (cliente).
const SESSION_COOKIE = "session";

// -----------------------------------------------------------------------------
// extractTokenFromHeaders()
// Lee el token JWT del header Authorization: Bearer <token>.
// Se usa cuando el cliente envía el token por header (fetch con credentials).
// Devuelve el token string o null si no existe.
// -----------------------------------------------------------------------------
async function extractTokenFromHeaders(): Promise<string | null> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // Quitamos el prefijo "Bearer " (7 caracteres) para quedarnos solo con el token.
    return authHeader.slice(7);
  }
  return null;
}

// -----------------------------------------------------------------------------
// extractTokenFromCookie()
// Lee el token JWT de la cookie HttpOnly "session".
// Se usa por el middleware (proxy.ts) y por getSession() en el servidor.
// Devuelve el valor de la cookie o null si no existe.
// -----------------------------------------------------------------------------
async function extractTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

// -----------------------------------------------------------------------------
// getSession()
// Función principal para obtener la sesión del usuario actual.
// Flujo:
//   1. Intenta extraer el token del header Authorization (cliente fetch).
//   2. Si no hay header, intenta extraerlo de la cookie HttpOnly.
//   3. Si no hay token en ninguna parte, devuelve null (no autenticado).
//   4. Verifica la firma y expiración del JWT con verifyToken().
//   5. Consulta el usuario en la base de datos para verificar:
//        - Que exista (findUnique).
//        - Que esté activo (isActive === true).
//        - Que tokenVersion en BD coincida con la del token (tv).
//        Si cualquiera falla, la sesión es invocada como nula (revocación).
//   6. Si todo es válido, devuelve { userId, role }.
// -----------------------------------------------------------------------------
export async function getSession(): Promise<Session> {
  const token = await extractTokenFromHeaders() ?? await extractTokenFromCookie();

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token);
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true, tokenVersion: true },
    });
    // Si el usuario no existe, está inactivo o su tokenVersion cambió
    // (por cambio de contraseña o correo), el token queda revocado.
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    // Token malformado, expirado o firma inválida.
    return null;
  }
}

// -----------------------------------------------------------------------------
// createSession(userId, role)
// Crea un nuevo JWT de sesión y lo guarda en la cookie HttpOnly.
// Flujo:
//   1. Lee tokenVersion actual del usuario en BD (para incluirlo en el JWT).
//   2. Crea el JWT firmado con createToken({ userId, role, tv }).
//   3. Guarda el JWT en la cookie "session" con opciones de seguridad:
//        httpOnly: true   -> JavaScript no puede leerla (protege contra XSS).
//        secure: true     -> Solo sobre HTTPS en producción.
//        sameSite: "lax"  -> Protege contra CSRF.
//        path: "/"        -> Disponible en toda la app.
//        maxAge: 7 días   -> Expiración de la sesión.
//   4. Devuelve el token string (útil para devolverlo al cliente en login/register).
// -----------------------------------------------------------------------------
export async function createSession(
  userId: string,
  role: "user" | "admin" | "employee",
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  const token = await createToken({
    userId,
    role,
    tv: user?.tokenVersion ?? 0,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return token;
}

// -----------------------------------------------------------------------------
// deleteSession()
// Elimina la cookie de sesión "session". Se usa en logout y al cambiar el
// correo de usuario (para forzar re-login y re-verificación).
// -----------------------------------------------------------------------------
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
