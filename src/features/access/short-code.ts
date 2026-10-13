import { randomInt } from "node:crypto";

// ---------------------------------------------------------------------------
// Código corto transcribible.
//
// El QR lleva un token de 32 caracteres que nadie puede copiar a mano. Si la
// cámara falla (sin permiso, poca luz, pantalla dañada) el empleado necesita
// algo corto que pueda leer en voz alta o teclear. Este código es ese respaldo:
// 8 símbolos de un alfabeto sin caracteres que se confunden entre sí, para que
// transcribirlo no falle.
//
// No reemplaza al token: es la misma autorización, con la misma caducidad y las
// mismas reglas. Solo evita que un fallo de cámara deje al cliente afuera.
// ---------------------------------------------------------------------------

/**
 * 30 símbolos: 22 letras y 8 dígitos.
 *
 * Se excluyen I, L, O y Z porque son los caracteres que alguien dicta o teclea
 * mal con facilidad; si estuvieran en el alfabeto, un código que los contenga
 * sería imposible de escribir (ver CONFUSIONES).
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXY23456789";

/** 8 símbolos = 30^8 combinaciones (~650 mil millones). */
const LARGO = 8;

/**
 * Al teclear o dictar, estas parejas se confunden entre sí. Ninguna de las dos
 * letras de cada par está en el alfabeto, así que la traducción nunca rompe un
 * código válido.
 */
const CONFUSIONES: Record<string, string> = {
  "0": "Q",
  O: "Q",
  "1": "J",
  I: "J",
  L: "J",
  Z: "2",
};

/** Genera un código aleatorio nuevo. El unicidad lo garantiza el índice único. */
export function generateShortCode(): string {
  let code = "";
  for (let i = 0; i < LARGO; i++) {
    code += ALFABETO[randomInt(0, ALFABETO.length)];
  }
  return code;
}

/**
 * Normaliza lo que el empleado escribe: mayúsculas, sin guiones ni espacios y
 * corrigiendo las confusiones ("k7m-2xqp4" -> "K7M2XQP4", "o" -> "Q",
 * "il" -> "JJ").
 */
export function normalizeShortCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .map((ch) => CONFUSIONES[ch] ?? ch)
    .join("");
}

/** ¿El texto tiene forma de código corto? Evita lanzar una búsqueda para cualquier cosa. */
export function looksLikeShortCode(raw: string): boolean {
  const code = normalizeShortCode(raw);
  return code.length === LARGO && code.split("").every((ch) => ALFABETO.includes(ch));
}

/**
 * Presenta el código como se imprime en el correo y el PDF: "K7M2-XQP4".
 *
 * Solo formatea. No normaliza, a propósito: `normalizeShortCode` está para
 * interpretar lo que escribe el empleado y cambia los caracteres que confunde;
 * usar esa misma función sobre un código ya generado podría mostrar un código
 * distinto del de verdad si alguien corrigiera a mano una fila.
 */
export function formatShortCode(code: string): string {
  const limpio = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (limpio.length !== LARGO) return code;
  return `${limpio.slice(0, 4)}-${limpio.slice(4)}`;
}

/** El alfabeto, para los tests. */
export const SHORT_CODE_ALPHABET = ALFABETO;