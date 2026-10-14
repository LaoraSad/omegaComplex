import { cache } from "react";
import { findSessionUserById, type SessionUser } from "@/features/auth/auth.repository";
import { logger } from "@/shared/lib/logger";
import { ServiceUnavailableError } from "@/shared/http/errors";

/**
 * Busca el usuario de una sesión distinguiendo dos situaciones que antes
 * terminaban igual: que el usuario no exista o esté inactivo, y que la base de
 * datos no responda.
 *
 * La diferencia importa. Con `findSessionUserById` a secas, si la base se caía
 * la excepción del driver subía hasta el layout y se veía el error crudo
 * ("Can't reach database server at ..."), que además confirma detalles de la
 * infraestructura a cualquiera que abra la página. Con esto, un problema de
 * conectividad sale como un 503 con un mensaje entendible, y un usuario
 * simplemente inexistente sigue siendo "no hay sesión" como siempre.
 *
 * Con memo por request (React `cache`): el layout y la página piden al mismo
 * usuario en la misma navegación y la BD se toca una sola vez. No se aplica a
 * `getSession`: sus tests la llaman varias veces con distinta cookie y el memo
 * fuera de un request los contaminaría.
 */
export const cargarUsuarioDeSesion = cache(cargarUsuarioDeSesionSinCache);

async function cargarUsuarioDeSesionSinCache(userId: string): Promise<SessionUser | null> {
  try {
    return await findSessionUserById(userId);
  } catch (error) {
    logger.error("sesion.usuario_no_consultable", { userId, error });
    throw new ServiceUnavailableError();
  }
}