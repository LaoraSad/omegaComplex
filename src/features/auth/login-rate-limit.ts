// -----------------------------------------------------------------------------
// src/features/auth/login-rate-limit.ts
// Limitación de intentos de login para proteger contra fuerza bruta.
// Los contadores viven en la base de datos (tabla LoginAttempt), por lo que
// sobreviven a reinicios y se comparten entre instancias del servidor.
// -----------------------------------------------------------------------------

import { db } from "@/shared/lib/db";
import { HttpError } from "@/shared/http/errors";

// -----------------------------------------------------------------------------
// Constantes de límites
// MAX_INTENTOS_POR_VENTANA: máximo de fallos por correo en la ventana.
// VENTANA_INTENTOS_MS: duración de la ventana (15 minutos).
// MAX_CUENTAS_POR_IP: máximo de cuentas distintas que una IP puede atacar.
// -----------------------------------------------------------------------------
export const MAX_INTENTOS_POR_VENTANA = 10;
export const VENTANA_INTENTOS_MS = 15 * 60 * 1000; // 15 minutos

export const MAX_CUENTAS_POR_IP = 30;

// -----------------------------------------------------------------------------
// registrarIntento(email, ip, success)
// Registra un intento de login (exitoso o fallido) en la tabla LoginAttempt.
// Se guarda tanto aciertos como fallos para mantener la ventana deslizante.
// Si falla la escritura en BD, no interrumpe el login (defensa secundaria).
// -----------------------------------------------------------------------------
export async function registrarIntento(email: string, ip: string | null, success: boolean) {
  try {
    await db.loginAttempt.create({
      data: { email: email.toLowerCase(), ip, success },
    });
  } catch {
    // Que falle el registro no debe tumbar el login.
  }
}

// -----------------------------------------------------------------------------
// verificarLimiteIntentos(email, ip)
// Se llama ANTES de comparar la contraseña.
//   1. Calcula el inicio de la ventana (ahora - 15 min).
//   2. Cuenta fallos por correo en la ventana.
//   3. Cuenta fallos por IP en la ventana.
//   4. Si fallosPorCorreo >= 10 → lanza 429 (bloqueo por correo).
//   5. Si fallosPorIp >= 30 → lanza 429 (bloqueo por IP).
// Así se detiene el ataque antes de gastar CPU en bcrypt.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// purgarIntentosAntiguos()
// Elimina intentos de login más antiguos que 4 ventanas (1 hora).
// Evita que la tabla crezca sin control. La ventana activa ya ignora los antiguos.
// -----------------------------------------------------------------------------
export async function purgarIntentosAntiguos() {
  const limite = new Date(Date.now() - VENTANA_INTENTOS_MS * 4);
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: limite } } });
}

// -----------------------------------------------------------------------------
// ipDesdeHeaders(headers)
// Lee la IP real del cliente desde cabeceras x-forwarded-for o x-real-ip.
// x-forwarded-for puede contener una cadena de IPs; la primera es la del origen.
// -----------------------------------------------------------------------------
export function ipDesdeHeaders(headers: Headers): string | null {
  const reenviada = headers.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return headers.get("x-real-ip") ?? null;
}
