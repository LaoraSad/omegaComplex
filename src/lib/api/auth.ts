import type { LoginData, RegisterData, ResetPasswordData } from "@/types/auth";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
};

export const AUTH_API_PATHS = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  resendVerificationEmail: "/api/auth/resend-verification",
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

  // Formato interno { data, error: { code, message } }
  const nested = value.error;
  if (isRecord(nested) && typeof nested.message === "string" && nested.message.trim()) {
    return nested.message;
  }

  const message = value.message ?? value.error;
  return typeof message === "string" && message.trim() ? message : undefined;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return readEnvelope<T>(response);
}

async function requestGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
  });

  return readEnvelope<T>(response);
}

async function readEnvelope<T>(response: Response): Promise<T> {

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = responseText ? JSON.parse(responseText) : undefined;
  } catch {
    payload = undefined;
  }

  if (response.ok) {
    // La API responde { data, error: null }
    if (isRecord(payload) && "data" in payload) {
      return payload.data as T;
    }
    return payload as T;
  }

  const message =
    getErrorMessage(payload) ??
    (responseText.trim() || `La solicitud falló (HTTP ${response.status}).`);

  throw new AuthApiError(message, response.status);
}

export function login(data: LoginData): Promise<AuthUser> {
  return request<AuthUser>(AUTH_API_PATHS.login, data);
}

export function register(data: RegisterData): Promise<AuthUser> {
  return request<AuthUser>(AUTH_API_PATHS.register, data);
}

export function logout(): Promise<void> {
  return request<void>(AUTH_API_PATHS.logout);
}

export function me(): Promise<AuthUser> {
  return requestGet<AuthUser>(AUTH_API_PATHS.me);
}

export function forgotPassword(email: string): Promise<void> {
  return request<void>(AUTH_API_PATHS.forgotPassword, { email });
}

export function resetPassword(data: ResetPasswordData): Promise<void> {
  return request<void>(AUTH_API_PATHS.resetPassword, data);
}

export function resendVerificationEmail(email: string): Promise<void> {
  return request<void>(AUTH_API_PATHS.resendVerificationEmail, { email });
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
