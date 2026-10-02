import { ForbiddenError, UnauthorizedError } from "../http/errors";
import { getSession } from "./session";

// Autorización por rol (T6).
export async function requireRole(...allowed: string[]) {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (!allowed.includes(session.role)) {
    throw new ForbiddenError("Rol insuficiente");
  }
  return session;
}
