// -----------------------------------------------------------------------------
// src/shared/auth/session-user.ts
// Carga los datos del usuario asociado a una sesión activa.
// Usa React `cache` para memoizar por request: si el layout y la página piden
// el mismo usuario en la misma navegación, la base de datos se toca una sola vez.
// -----------------------------------------------------------------------------

import { cache } from "react";
import { findSessionUserById, type SessionUser } from "@/features/auth/auth.repository";
import { logger } from "@/shared/lib/logger";
import { ServiceUnavailableError } from "@/shared/http/errors";

// -----------------------------------------------------------------------------
// cargarUsuarioDeSesion
// Versión memoizada (por request) de cargarUsuarioDeSesionSinCache.
// Se usa en getSession y en páginas de servidor para obtener los datos del
// usuario sin consultar la BD múltiples veces.
// -----------------------------------------------------------------------------
export const cargarUsuarioDeSesion = cache(cargarUsuarioDeSesionSinCache);

// -----------------------------------------------------------------------------
// cargarUsuarioDeSesionSinCache(userId)
// Busca el usuario por id distinguiendo dos situaciones:
//   1. Usuario no existe o está inactivo → devuelve null (no hay sesión).
//   2. La base de datos no responde → lanza ServiceUnavailableError (503).
//
// Esta distinción importa: si la BD se cae, no se expone el error crudo del
// driver al cliente (seguridad); se muestra un 503 con mensaje entendible.
// -----------------------------------------------------------------------------
async function cargarUsuarioDeSesionSinCache(userId: string): Promise<SessionUser | null> {
  try {
    return await findSessionUserById(userId);
  } catch (error) {
    logger.error("sesion.usuario_no_consultable", { userId, error });
    throw new ServiceUnavailableError();
  }
}
