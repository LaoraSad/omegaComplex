// Formato único de respuesta API.
export type ApiSuccess<T> = { data: T; error: null };
export type ApiFailure = { data: null; error: { code: string; message: string } };

export function ok<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function fail(code: string, message: string): ApiFailure {
  return { data: null, error: { code, message } };
}
