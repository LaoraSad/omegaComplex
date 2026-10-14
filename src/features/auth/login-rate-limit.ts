// Limitación de intentos de login por correo e IP.
import { db } from "@/shared/lib/db";
import { HttpError } from "@/shared/http/errors";

/**
 * Límite de intentos de inicio de sesión.
 *
 * Sin esto, `login` acepta ilimitados intentos por segundo: un atacante con un
 * diccionario de contraseñas puede probar miles de combinaciones contra una
 * cuenta conocida sin que nada lo detenga. El contador vive en la base y no en
 * memoria, así que sobrevive a un reinicio del servidor y es compartido entre
 * instancias.
 */
export const MAX_INTENTOS_POR_VENTANA = 10;
export const VENTANA_INTENTOS_MS = 15 * 60 * 1000; // 15 minutos

/** Máximo de cuentas distintas que una misma IP puede atacar en la ventana. */
export const MAX_CUENTAS_POR_IP = 30;

/**
 * Registra el intento. Se escribe tanto el acierto como el fallo a propósito:
 * el contador que corta la fuerza bruta es el de fallos, pero guardar también
 * los aciertos mantiene la ventana deslizando de forma uniforme.
 */
export async function registrarIntento(email: string, ip: string | null, success: boolean) {
  try {
    await db.loginAttempt.create({
      data: { email: email.toLowerCase(), ip, success },
    });
  } catch {
    // Que falle el registro no debe tumbar el login: el límite es una defensa
    // secundaria, no la condición para poder autenticarse.
  }
}

/**
 * Corta el intento si se superó cualquiera de los dos límites. Se llama ANTES
 * de comparar la contraseña: si se comprobara después, el atacante podría
 * seguir gastando CPU en bcrypt.
 */
export async function verificarLimiteIntentos(email: string, ip: string | null): Promise<void> {
  const desde = new Date(Date.now() - VENTANA_INTENTOS_MS);

  const fallosPorCorreo = await db.loginAttempt.count({
    where: { email: email.toLowerCase(), success: false, createdAt: { gte: desde } },
  });

  const fallosPorIp = ip
    ? await db.loginAttempt.count({
        where: { ip, success: false, createdAt: { gte: desde } },
      })
    : 0;

  if (fallosPorCorreo >= MAX_INTENTOS_POR_VENTANA) {
    throw new HttpError(
      429,
      "TOO_MANY_LOGIN_ATTEMPTS",
      "Demasiados intentos fallidos con este correo. Espera unos minutos antes de volver a intentar.",
    );
  }

  if (fallosPorIp >= MAX_CUENTAS_POR_IP) {
    throw new HttpError(
      429,
      "TOO_MANY_LOGIN_ATTEMPTS",
      "Demasiados intentos fallidos desde esta conexión. Espera unos minutos antes de volver a intentar.",
    );
  }
}

/** Limpia registros antiguos. La ventana ya los ignora; esto solo evita que crezcan sin control. */
export async function purgarIntentosAntiguos() {
  const limite = new Date(Date.now() - VENTANA_INTENTOS_MS * 4);
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: limite } } });
}

/**
 * Lee la IP de origen. Detrás de un proxy o de un servicio de hosting la
 * cabecera real es `x-forwarded-for`, y trae una cadena de IPs de la más
 * externa a la más interna: la del atacante es la primera.
 */
export function ipDesdeHeaders(headers: Headers): string | null {
  const reenviada = headers.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return headers.get("x-real-ip") ?? null;
}