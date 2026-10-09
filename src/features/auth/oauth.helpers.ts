// Utilidades de SERVIDOR del flujo OAuth con Google.
// No se importa desde componentes de cliente: usa next/headers.

import { createSession } from "@/shared/auth/session";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

/** Sin estas dos claves el flujo no puede arrancar. */
export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Debe coincidir exactamente con la URI de redireccion registrada en Google. */
export function googleRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}/api/auth/oauth/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Fuerza el selector de cuenta: el registro manual y el de Google no deben
    // mezclarse en silencio.
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export function toSessionRole(role: string): "user" | "admin" | "employee" {
  return role === "admin" || role === "employee" ? role : "user";
}

/** A donde cae cada rol tras autenticarse. */
export function homeFor(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "employee") return "/validar";
  return "/";
}

export async function startSession(userId: string, role: string): Promise<void> {
  await createSession(userId, toSessionRole(role));
}