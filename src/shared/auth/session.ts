// Lectura de sesión actual.
// TODO: implementar con cookies/JWT o Auth.js según decisión Dev1.
import { cookies } from "next/headers";

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
    return await verifyToken(token);
  } catch {
    return null;
  }
}
export async function createSession(
  userId: string,
  role: "user" | "admin" | "employee",
) {
  const token = await createToken({
    userId,
    role,
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
