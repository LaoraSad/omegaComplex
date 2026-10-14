// Lectura de sesión actual.
import { cookies } from "next/headers";

import { db } from "@/shared/lib/db";
import { verifyToken, createToken } from "./jwt";

export type Session = {
  userId: string;
  role: "user" | "admin" | "employee";
} | null;

const SESSION_COOKIE = "session";

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token);
    // P1-5: la firma no basta. Si la contraseña cambió (tokenVersion) o la
    // cuenta se desactivó, el token queda revocado aunque no haya vencido.
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
export async function createSession(
  userId: string,
  role: "user" | "admin" | "employee",
) {
  // La versión vigente viaja en el token: así un cambio de contraseña
  // posterior revoca esta sesión sin lista de revocación.
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
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
}
