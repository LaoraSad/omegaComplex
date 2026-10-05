import type { DayRangeUtc } from "./availability.types";

/**
 * Zona horaria del complejo. Todo lo que el usuario ve (fechas de franjas,
 * "hoy", "mañana") se interpreta en esta zona, nunca en la del servidor.
 */
export const TIME_ZONE = "America/Bogota";

// `hourCycle: "h23"` evita que Intl devuelva la medianoche como hora "24".
const bogotaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Descompone un instante UTC en las piezas de reloj que ve un usuario en Bogotá. */
function getBogotaParts(instant: Date): ZonedParts {
  const parts = bogotaFormatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((item) => item.type === type);
    return part ? Number(part.value) : Number.NaN;
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/**
 * Desplazamiento de Bogotá respecto a UTC, en milisegundos, para un instante dado.
 * Misma convención que `Date.prototype.getTimezoneOffset`: es positivo cuando la
 * zona va por detrás de UTC (Bogotá es UTC-5, por tanto +5h), y para convertir una
 * hora de reloj local a un instante UTC se **suma** este valor.
 *
 * Se calcula con Intl en lugar de una constante fija para que el módulo siga
 * siendo correcto si la zona cambiara su regla (horario de verano, etc.).
 */
function getBogotaOffsetMs(instant: Date): number {
  const parts = getBogotaParts(instant);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  // Se descarta la parte de milisegundos del instante para no contaminar la resta.
  return Math.floor(instant.getTime() / 1000) * 1000 - asUtc;
}

function parseDateString(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

/**
 * Instante UTC que corresponde a las 00:00:00 del día local `date` (YYYY-MM-DD).
 *
 * No se puede usar `new Date("2026-10-10")`: el formato ISO sin hora se parsea
 * como medianoche **UTC**, que en Bogotá es la tarde del día anterior. Eso
 * desplazaría la consulta un día hacia atrás.
 */
function bogotaDayStartUtc(date: string): Date {
  const { year, month, day } = parseDateString(date);
  const naiveUtc = Date.UTC(year, month - 1, day, 0, 0, 0);

  // Primera estimación: se aplica el offset vigente.
  const firstGuess = new Date(naiveUtc + getBogotaOffsetMs(new Date(naiveUtc)));

  // Si el instante corregido cae en un tramo con otro offset (p. ej. un cambio de
  // horario justo a medianoche), se reintenta una vez con el offset ya corregido.
  const correctedOffset = getBogotaOffsetMs(firstGuess);

  return new Date(naiveUtc + correctedOffset);
}

/** Suma un día a una fecha YYYY-MM-DD usando aritmética de calendario (sin zona horaria). */
function addOneDay(date: string): string {
  const { year, month, day } = parseDateString(date);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Rango UTC semiabierto [start, end) que cubre el día local `date` completo. */
export function getBogotaDayRange(date: string): DayRangeUtc {
  return {
    startUtc: bogotaDayStartUtc(date),
    endUtc: bogotaDayStartUtc(addOneDay(date)),
  };
}

/**
 * Convierte un instante a la fecha YYYY-MM-DD que ve el usuario en Bogotá.
 * Las respuestas de reservas la usan para que el frontend no tenga que
 * reinterpretar el ISO UTC y corra el riesgo de mostrar el día anterior.
 */
export function toBogotaDateString(instant: Date): string {
  const parts = getBogotaParts(instant);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}