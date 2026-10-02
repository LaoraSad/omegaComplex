import type { LoginData, RegisterData, ResetPasswordData } from "@/types/auth";

export const AUTH_API_PATHS = {
  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  resendVerificationEmail: "/auth/resend-verification",
} as const;

export class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  const message = value.message ?? value.error;
  return typeof message === "string" && message.trim() ? message : undefined;
}

async function request(path: string, body?: unknown): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new AuthApiError("La API no está configurada. Define NEXT_PUBLIC_API_URL.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.ok) return;

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = undefined;
  }

  const message =
    getErrorMessage(payload) ??
    (responseText.trim() || `La solicitud falló (HTTP ${response.status}).`);

  throw new AuthApiError(message, response.status);
}

export function login(data: LoginData): Promise<void> {
  return request(AUTH_API_PATHS.login, data);
}

export function register(data: RegisterData): Promise<void> {
  return request(AUTH_API_PATHS.register, data);
}

export function forgotPassword(email: string): Promise<void> {
  return request(AUTH_API_PATHS.forgotPassword, { email });
}

export function resetPassword(data: ResetPasswordData): Promise<void> {
  return request(AUTH_API_PATHS.resetPassword, data);
}

export function resendVerificationEmail(email: string): Promise<void> {
  return request(AUTH_API_PATHS.resendVerificationEmail, { email });
}

export function loginWithGoogle(): Promise<never> {
  return Promise.reject(
    new AuthApiError(
      "La integración con Google estará disponible cuando se defina el proveedor de autenticación.",
    ),
  );
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
