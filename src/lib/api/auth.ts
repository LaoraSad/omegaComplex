// -----------------------------------------------------------------------------
// src/lib/api/auth.ts
// Cliente de API para autenticación desde el lado del cliente (navegador).
// Envuelve fetch contra los endpoints /api/auth/* y gestiona el token en
// sessionStorage. Cada función pública corresponde a un endpoint del backend.
// -----------------------------------------------------------------------------

import type { LoginData, RegisterData, ResetPasswordData } from "@/types/auth";
import { borrarCarritoGuardado } from "@/components/storefront/CarritoReserva";

// -----------------------------------------------------------------------------
// AuthUser (tipo)
// Representa al usuario autenticado devuelto por login/register/me.
//   id, email, firstName, lastName, phone, role, emailVerified, token.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// UpdateProfileResult (tipo)
// Resultado de actualizar perfil (teléfono o correo).
// -----------------------------------------------------------------------------
export type UpdateProfileResult = {
  phoneUpdated: boolean;
  emailChanged: boolean;
  newEmail?: string;
  verificationEmailSent?: boolean;
};

// -----------------------------------------------------------------------------
// AUTH_API_PATHS
// Rutas de los endpoints de autenticación en el mismo origen.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// RegistrationResult (tipo)
// Resultado del registro: datos del usuario + si se envió el correo de verificación.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// AuthApiError (clase)
// Error lanzado por el cliente cuando un endpoint de auth responde con error.
// Incluye status y code para que la UI pueda mostrar mensajes específicos.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// isRecord / getErrorCode / getErrorMessage
// Utilidades para extraer código y mensaje del cuerpo de respuesta JSON
// con formato { data, error: { code, message } }.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Manejo del token en sessionStorage (clave: "auth_token")
// Nota: sessionStorage sobrevive a la navegación dentro de la misma pestaña,
// pero se limpia al cerrarla. No se comparte entre pestañas/ventanas.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// request(path, body)
// Función genérica para peticiones POST con cuerpo JSON.
//   - Lee el token de sessionStorage y lo envía como Authorization: Bearer.
//   - credentials: "include" para enviar cookies (session HttpOnly) junto.
//   - Parsea el sobre { data, error } y, si hay un token en data, lo guarda.
//   - Lanza AuthApiError si la respuesta no es exitosa.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// requestGet(path)
// Petición GET con token y cookies.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// requestPatch(path, body)
// Petición PATCH con cuerpo JSON, token y cookies.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// readEnvelope(response)
// Procesa la respuesta HTTP y extrae el sobre { data, error }.
//   - Si es exitosa y hay token en data, lo guarda en sessionStorage.
//   - Si falla, extrae código y mensaje y lanza AuthApiError.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Funciones públicas (una por endpoint)
// -----------------------------------------------------------------------------

// login: POST /api/auth/login. Guarda el token devuelto.
export async function login(data: LoginData): Promise<AuthUser> {
  const result = await request<AuthUser>(AUTH_API_PATHS.login, data);
  if (result.token) {
    setToken(result.token);
  }
  return result;
}

// register: POST /api/auth/register. Guarda el token devuelto.
export async function register(data: RegisterData): Promise<RegistrationResult> {
  const result = await request<RegistrationResult>(AUTH_API_PATHS.register, data);
  if (result.token) {
    setToken(result.token);
  }
  return result;
}

// logout: POST /api/auth/logout. Borra carrito guardado, token y cierra sesión en servidor.
export async function logout(): Promise<void> {
  borrarCarritoGuardado();
  clearToken();
  await request<void>(AUTH_API_PATHS.logout);
}

// me: GET /api/auth/me. Obtiene el usuario autenticado.
export function me(): Promise<AuthUser> {
  return requestGet<AuthUser>(AUTH_API_PATHS.me);
}

// forgotPassword: POST /api/auth/forgot-password.
export function forgotPassword(email: string): Promise<void> {
  return request<void>(AUTH_API_PATHS.forgotPassword, { email });
}

// resetPassword: POST /api/auth/reset-password.
export function resetPassword(data: ResetPasswordData): Promise<void> {
  return request<void>(AUTH_API_PATHS.resetPassword, data);
}

// resendVerificationEmail: POST /api/auth/resend-verification.
export function resendVerificationEmail(email: string): Promise<void> {
  return request<void>(AUTH_API_PATHS.resendVerificationEmail, { email });
}

// verifyEmail: POST /api/auth/verify-email.
export function verifyEmail(email: string, code: string): Promise<void> {
  return request<void>(AUTH_API_PATHS.verifyEmail, { email, code });
}

// changePassword: POST /api/auth/change-password.
export function changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
  return request<{ message: string }>(AUTH_API_PATHS.changePassword, data);
}

// updateProfile: PATCH /api/auth/me (teléfono o correo).
export function updateProfile(data: { phone?: string; email?: string }): Promise<UpdateProfileResult> {
  return requestPatch<UpdateProfileResult>(AUTH_API_PATHS.me, data);
}

// -----------------------------------------------------------------------------
// Utilidades para la UI
// -----------------------------------------------------------------------------
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function getStoredToken(): string | null {
  return getToken();
}
