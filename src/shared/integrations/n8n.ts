import { createHmac } from "node:crypto";

import { logger } from "@/shared/lib/logger";

/**
 * Puente hacia los workflows de n8n.
 *
 * La aplicación no envía los correos herself: le dice a n8n qué pasó y es n8n
 * quien decide qué hacer (mandar el correo de bienvenida, el código de
 * verificación, el PDF de los QR...). Así los workflows se pueden cambiar sin
 * tocar código ni redesplegar.
 *
 * Dos garantías:
 *
 * 1. La petición va firmada con HMAC-SHA256 y una marca de tiempo, para que
 *    n8n pueda descartar lo que llegue con la firma rota o demasiado viejo.
 *    Sin esto, cualquiera que conozca la URL podría inyectar altas falsas.
 *
 * 2. `enviarEvento` nunca lanza. Un n8n caído no puede tumbar un registro ni
 *    una reserva pagada; el evento se pierde y queda registrado, y el llamador
 *    aplica su plan B (el envío directo por Resend).
 */

/** Eventos que la aplicación le reporta a n8n. */
export type EventoN8n =
  | "usuario.registrado"
  | "usuario.verificado"
  | "reserva.confirmada";

export type CargaEvento = Record<string, unknown>;

const TIMEOUT_MS = 8000;
/** Ventana de validez de la firma. Pasados 5 minutos el evento se descarta. */
const MAX_ANTIGUEDAD_S = 300;

function credenciales(): { url: string; secreto: string } | null {
  const url = process.env.N8N_WEBHOOK_URL;
  const secreto = process.env.N8N_WEBHOOK_SECRET;

  // Sin configurar no es un error: el proyecto funciona igual con el envío
  // directo por Resend. Solo se pierde la automatización.
  if (!url || !secreto) return null;
  return { url, secreto };
}

export function n8nConfigurado(): boolean {
  return credenciales() !== null;
}

/** Firma del cuerpo: HMAC del `evento.timestamp.datos`. */
function firmar(evento: string, timestamp: number, cuerpo: string, secreto: string): string {
  return createHmac("sha256", secreto)
    .update(`${evento}.${timestamp}.${cuerpo}`)
    .digest("hex");
}

export type ResultadoEnvio = { entregado: boolean; motivo?: string };

export async function enviarEvento(
  evento: EventoN8n,
  datos: CargaEvento,
): Promise<ResultadoEnvio> {
  const cred = credenciales();

  if (!cred) {
    return { entregado: false, motivo: "n8n no configurado" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const cuerpo = JSON.stringify({ evento, timestamp, datos });
  const firma = firmar(evento, timestamp, cuerpo, cred.secreto);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(cred.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Cabeceras propias: n8n las lee con una expresión en el nodo Webhook.
        "X-Omega-Event": evento,
        "X-Omega-Timestamp": String(timestamp),
        "X-Omega-Signature": firma,
      },
      body: cuerpo,
      signal: controller.signal,
    });

    if (!res.ok) {
      return { entregado: false, motivo: `n8n respondió ${res.status}` };
    }

    return { entregado: true };
  } catch (error) {
    // Nunca se propaga: el flujo principal no depende de que n8n esté arriba.
    const motivo = error instanceof Error ? error.message : "error desconocido";
    logger.error("n8n.envio_fallido", { evento, motivo });
    return { entregado: false, motivo };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Comprueba una firma recibida. La usa el lado de n8n replicada en un endpoint
 * propio, y sirve como referencia del algoritmo que el workflow debe usar.
 */
export function verificarFirma(
  evento: string,
  timestamp: number,
  cuerpo: string,
  firmaRecibida: string,
): boolean {
  const cred = credenciales();
  if (!cred) return false;

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > MAX_ANTIGUEDAD_S) {
    return false;
  }

  const esperada = firmar(evento, timestamp, cuerpo, cred.secreto);
  // Comparación de tiempo constante para no filtrar información por tiempo.
  if (esperada.length !== firmaRecibida.length) return false;

  let diferencia = 0;
  for (let i = 0; i < esperada.length; i++) {
    diferencia |= esperada.charCodeAt(i) ^ firmaRecibida.charCodeAt(i);
  }
  return diferencia === 0;
}