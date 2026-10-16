// URL pública de la app.
// Sirve para armar enlaces que el navegador del cliente tiene que poder abrir:
// redirecciones de OAuth, correos, retornos de pago.

import { env } from "@/shared/lib/env";

/**
 * Origen público real de la app, tal como lo ve el navegador.
 *
 * Nunca se debe usar `request.url` para armar una redirección. Dentro del
 * contenedor la app escucha en `0.0.0.0:3000` y Next arma las URLs con ese host
 * interno, así que una redirección terminaba en `https://0.0.0.0:3000/login...`
 * y el navegador la rechazaba con `ERR_ADDRESS_INVALID` aunque la sesión ya
 * estuviera abierta. El dominio público vive en `NEXT_PUBLIC_APP_URL`.
 */
export function appOrigin(): string {
  const raw = env.NEXT_PUBLIC_APP_URL;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`NEXT_PUBLIC_APP_URL no es una URL válida: "${raw}"`);
  }

  // Un host interno compila y pasa los tests, pero rompe justo cuando el
  // usuario tiene que volver a la app. Mejor fallar fuerte y temprano.
  if (
    process.env.NODE_ENV === "production" &&
    (url.hostname === "0.0.0.0" || url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    throw new Error(
      `NEXT_PUBLIC_APP_URL apunta a ${url.hostname}, que no es accesible desde el navegador en producción.`,
    );
  }

  return url.origin;
}

/** Enlace absoluto a una ruta de la app, para redirecciones del navegador. */
export function appUrl(path: string): string {
  return new URL(path, appOrigin()).toString();
}
