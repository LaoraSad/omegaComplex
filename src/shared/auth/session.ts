// Lectura de sesión actual. Soporta Authorization header (sessionStorage) y cookie (legacy).
import { cookies, headers } from "next/headers";

import { db } from "@/shared/lib/db";
import { verifyToken, createToken } from "./jwt";

export type Session = {
  userId: string;
  role: "user" | "admin" | "employee";
} | null;

const SESSION_COOKIE = "session";

async function extractTokenFromHeaders(): Promise<string | null> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

async function extractTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

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
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
