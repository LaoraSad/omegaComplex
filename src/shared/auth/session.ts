// Lectura de sesión actual.
// TODO: implementar con cookies/JWT o Auth.js según decisión Dev1.
export type Session = { userId: string; role: string } | null;

export async function getSession(): Promise<Session> {
  return null;
}
