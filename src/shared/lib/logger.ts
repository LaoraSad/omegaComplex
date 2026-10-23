// Registro estructurado de eventos críticos (auditoría mínima del MVP).
// Una sola línea JSON por evento: timestamp, evento y contexto. En producción
// la plataforma de despliegue recolecta stdout; aquí no se imprimen secretos.
export type LogContext = Record<string, unknown>;

function line(level: "info" | "warn" | "error", event: string, context?: LogContext): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(context ? { context: sanitize(context) } : {}),
  };
  const text = JSON.stringify(payload);
  if (level === "error") console.error(text);
  else console.log(text);
}

/** Quita valores que parezcan secretos antes de imprimir. */
function sanitize(context: LogContext): LogContext {
  const banned = ["token", "password", "secret", "code", "authorization"];
  const clean: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (banned.some((b) => key.toLowerCase().includes(b))) {
      clean[key] = "[redacted]";
      continue;
    }
    clean[key] = value instanceof Error ? value.message : value;
  }
  return clean;
}

export const logger = {
  info: (event: string, context?: LogContext) => line("info", event, context),
  warn: (event: string, context?: LogContext) => line("warn", event, context),
  error: (event: string, context?: LogContext) => line("error", event, context),
};
