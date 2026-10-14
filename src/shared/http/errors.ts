// Errores HTTP tipados (400-503).
// Clases de error del dominio HTTP.
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

/**
 * El servicio que se necesita para responder no está disponible. Se usa, por
 * ejemplo, cuando la base de datos no responde: en ese caso lo correcto es
 * mostrar un mensaje y reintentar, no dejar que la excepcion del driver suba
 * hasta la pantalla con el detalle tecnico.
 */
export class ServiceUnavailableError extends HttpError {
  constructor(message = "El servicio no está disponible en este momento. Inténtalo de nuevo en un instante.") {
    super(503, "SERVICE_UNAVAILABLE", message);
  }
}
