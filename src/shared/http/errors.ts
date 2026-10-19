// -----------------------------------------------------------------------------
// src/shared/http/errors.ts
// Clases de error tipadas para el dominio HTTP.
// Cada una extiende HttpError y define un status y code por defecto.
// Se usan en servicios y repositorios para lanzar errores controlados que el
// handler() de route handlers convertirá en respuestas HTTP.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// HttpError (clase base)
// Error HTTP genérico con:
//   status: código de estado HTTP (200-599).
//   code: código de error legible para la API.
//   message: mensaje descriptivo.
// -----------------------------------------------------------------------------
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// -----------------------------------------------------------------------------
// NotFoundError (404)
// Recurso no encontrado.
// -----------------------------------------------------------------------------
export class NotFoundError extends HttpError {
  constructor(message = "Recurso no encontrado") {
    super(404, "NOT_FOUND", message);
  }
}

// -----------------------------------------------------------------------------
// UnauthorizedError (401)
// Usuario no autenticado (falta sesión o token inválido).
// -----------------------------------------------------------------------------
export class UnauthorizedError extends HttpError {
  constructor(message = "No autenticado") {
    super(401, "UNAUTHORIZED", message);
  }
}

// -----------------------------------------------------------------------------
// ForbiddenError (403)
// Usuario autenticado pero sin permisos (rol insuficiente o email no verificado).
// -----------------------------------------------------------------------------
export class ForbiddenError extends HttpError {
  constructor(message = "Acceso denegado") {
    super(403, "FORBIDDEN", message);
  }
}

// -----------------------------------------------------------------------------
// ValidationError (400)
// Datos de entrada inválidos (falló validación con Zod, por ejemplo).
// -----------------------------------------------------------------------------
export class ValidationError extends HttpError {
  constructor(message = "Datos inválidos") {
    super(400, "VALIDATION_ERROR", message);
  }
}

// -----------------------------------------------------------------------------
// ConflictError (409)
// Conflicto de estado (ej. email ya registrado, cupo agotado, solape de reserva).
// -----------------------------------------------------------------------------
export class ConflictError extends HttpError {
  constructor(message = "Conflicto de estado") {
    super(409, "CONFLICT", message);
  }
}

// -----------------------------------------------------------------------------
// ServiceUnavailableError (503)
// El servicio necesario no está disponible (ej. base de datos no responde).
// Se usa para evitar exponer detalles técnicos de infraestructura al cliente.
// -----------------------------------------------------------------------------
export class ServiceUnavailableError extends HttpError {
  constructor(message = "El servicio no está disponible en este momento. Inténtalo de nuevo en un instante.") {
    super(503, "SERVICE_UNAVAILABLE", message);
  }
}
