// Helpers de API para autenticación desde cliente.
import type { LoginData, RegisterData, ResetPasswordData } from "@/types/auth";
import { borrarCarritoGuardado } from "@/components/storefront/CarritoReserva";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  emailVerified?: boolean;
  token?: string;
};

export type UpdateProfileResult = {
  phoneUpdated: boolean;
  emailChanged: boolean;
  newEmail?: string;
  verificationEmailSent?: boolean;
};

export const AUTH_API_PATHS = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  resendVerificationEmail: "/api/auth/resend-verification",
  verifyEmail: "/api/auth/verify-email",
  changePassword: "/api/auth/change-password",
} as const;

export type RegistrationResult = {
  email: string;
  verificationEmailSent: boolean;
  token?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role?: string;
  emailVerified?: boolean;
};

export class AuthApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorCode(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const nested = value.error;
  if (isRecord(nested) && typeof nested.code === "string") return nested.code;
  return typeof value.code === "string" ? value.code : undefined;
}

function getErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  const nested = value.error;
  if (isRecord(nested) && typeof nested.message === "string" && nested.message.trim()) {
    return nested.message;
  }

  const message = value.message ?? value.error;
  return typeof message === "string" && message.trim() ? message : undefined;
}

const TOKEN_KEY = "auth_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: "POST",
    headers,
    credentials: "include",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return readEnvelope<T>(response);
}

async function requestGet<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: "GET",
    headers,
    credentials: "include",
  });

  return readEnvelope<T>(response);
}

async function requestPatch<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
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
    if (isRecord(payload) && "data" in payload) {
      const data = payload.data as Record<string, unknown>;
      if (typeof data.token === "string") {
        setToken(data.token);
      }
      return data as T;
    }
    return payload as T;
  }

  const message =
    getErrorMessage(payload) ??
    (responseText.trim() || `La solicitud falló (HTTP ${response.status}).`);

  throw new AuthApiError(message, response.status, getErrorCode(payload));
}

export async function login(data: LoginData): Promise<AuthUser> {
  const result = await request<AuthUser>(AUTH_API_PATHS.login, data);
  if (result.token) {
    setToken(result.token);
  }
  return result;
}

export async function register(data: RegisterData): Promise<RegistrationResult> {
  const result = await request<RegistrationResult>(AUTH_API_PATHS.register, data);
  if (result.token) {
    setToken(result.token);
  }
  return result;
}

export async function logout(): Promise<void> {
  borrarCarritoGuardado();
  clearToken();
  await request<void>(AUTH_API_PATHS.logout);
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

export function verifyEmail(email: string, code: string): Promise<void> {
  return request<void>(AUTH_API_PATHS.verifyEmail, { email, code });
}

export function changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
  return request<{ message: string }>(AUTH_API_PATHS.changePassword, data);
}

export function updateProfile(data: { phone?: string; email?: string }): Promise<UpdateProfileResult> {
  return requestPatch<UpdateProfileResult>(AUTH_API_PATHS.me, data);
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function getStoredToken(): string | null {
  return getToken();
}