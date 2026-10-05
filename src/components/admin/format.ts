// Formato consistente para todo el módulo admin (zona America/Bogota, COP).

const BOGOTA = "America/Bogota";

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function formatPercent(used: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((used / total) * 100)}%`;
}

export function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: BOGOTA,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: BOGOTA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: BOGOTA,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTodayLong(ref: Date = new Date()): string {
  const text = new Intl.DateTimeFormat("es-CO", {
    timeZone: BOGOTA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(ref);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "A";
}

export function toInputDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}
