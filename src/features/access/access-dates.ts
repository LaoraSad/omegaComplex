// Formateo de fechas del módulo de acceso en America/Bogota (COT = UTC-5 fijo).
// El empleado ve la hora de la franja como la ve en el complejo, no en UTC.

const BOGOTA = "America/Bogota";

/** Formatos usados por el módulo de acceso, con su configuración equivalente. */
const PATTERNS = {
  "yyyy-MM-dd": { year: "numeric", month: "2-digit", day: "2-digit" },
  "d MMM yyyy": { day: "numeric", month: "short", year: "numeric" },
  HHmm: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type AccessDatePattern = "yyyy-MM-dd" | "d MMM yyyy" | "HHmm";

const locale = PATTERNS["yyyy-MM-dd"].month === "2-digit" ? "en-CA" : "es-CO";

const cache = new Map<AccessDatePattern, Intl.DateTimeFormat>();

function formatter(pattern: AccessDatePattern): Intl.DateTimeFormat {
  let fmt = cache.get(pattern);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, {
      timeZone: BOGOTA,
      ...PATTERNS[pattern],
    });
    cache.set(pattern, fmt);
  }
  return fmt;
}

/** Formatea una fecha en la zona horaria del complejo. */
export function formatInTimeZone(value: Date | string, pattern: AccessDatePattern): string {
  const date = value instanceof Date ? value : new Date(value);
  return formatter(pattern).format(date);
}

/**
 * Hora en formato 24 h, como se lee un turno en el complejo y como lo escribe
 * el SCRUM (08:00 a 17:00).
 */
export function formatClock(value: Date | string): string {
  return formatInTimeZone(value, "HHmm");
}