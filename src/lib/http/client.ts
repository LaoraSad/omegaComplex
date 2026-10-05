import axios, { AxiosError, type AxiosResponse } from "axios";

/**
 * Cliente HTTP Axios para la API interna (`/api/...`).
 * Desenvuelve el formato `{ data, error }` y normaliza errores a `ApiClientError`.
 * La cookie de sesión viaja automáticamente (`withCredentials`).
 */
export class ApiClientError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const nested = payload.error;
    if (
      isRecord(nested) &&
      typeof nested.message === "string" &&
      nested.message.trim()
    ) {
      return nested.message;
    }
    const message = payload.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const payload = error.response?.data;
    const code =
      isRecord(payload) &&
      isRecord(payload.error) &&
      typeof payload.error.code === "string"
        ? payload.error.code
        : undefined;
    return new ApiClientError(
      extractMessage(payload, error.message || "Error de red. Intenta de nuevo."),
      status,
      code,
    );
  }

  return new ApiClientError(
    error instanceof Error ? error.message : "Error inesperado.",
  );
}

export const httpClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload = response.data;
    if (isRecord(payload) && "error" in payload) {
      if (payload.error) {
        throw toApiClientError({
          response: { status: response.status, data: payload },
        } as AxiosError);
      }
      return payload.data;
    }
    return payload;
  },
  (error: unknown) => {
    throw toApiClientError(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
