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
 */
export async function cargarUsuarioDeSesion(userId: string): Promise<SessionUser | null> {
  try {
    return await findSessionUserById(userId);
  } catch (error) {
    logger.error("sesion.usuario_no_consultable", { userId, error });
    throw new ServiceUnavailableError();
  }
}