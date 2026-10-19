// -----------------------------------------------------------------------------
// src/shared/http/api-response.ts
// Envelope uniforme para todas las respuestas de la API.
// Formato: { data: T | null, error: { code, message } | null }
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ApiSuccess<T> (tipo)
// Respuesta exitosa: data contiene el resultado y error es null.
// -----------------------------------------------------------------------------
export type ApiSuccess<T> = { data: T; error: null };

// -----------------------------------------------------------------------------
// ApiFailure (tipo)
// Respuesta fallida: data es null y error contiene el código y mensaje.
// -----------------------------------------------------------------------------
export type ApiFailure = { data: null; error: { code: string; message: string } };

// -----------------------------------------------------------------------------
// ok(data)
// Crea un sobre de respuesta exitosa.
//   data: cualquier dato serializable a JSON.
// Devuelve { data, error: null }.
// -----------------------------------------------------------------------------
export function ok<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

// -----------------------------------------------------------------------------
// fail(code, message)
// Crea un sobre de respuesta fallida.
//   code: código de error legible (ej. "VALIDATION_ERROR", "UNAUTHORIZED").
//   message: mensaje descriptivo para el cliente.
// Devuelve { data: null, error: { code, message } }.
// -----------------------------------------------------------------------------
export function fail(code: string, message: string): ApiFailure {
  return { data: null, error: { code, message } };
}
