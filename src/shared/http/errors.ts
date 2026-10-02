// Clases de error del dominio HTTP.
// TODO(T6): mapear a códigos de estado en handler.ts.
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso no encontrado") {
    super(404, "NOT_FOUND", message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "No autenticado") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Acceso denegado") {
    super(403, "FORBIDDEN", message);
  }
}

export class ValidationError extends HttpError {
  constructor(message = "Datos inválidos") {
    super(400, "VALIDATION_ERROR", message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflicto de estado") {
    super(409, "CONFLICT", message);
  }
}
