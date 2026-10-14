// Cliente Prisma único (singleton para dev/HMR).
import { PrismaClient } from "@prisma/client";

/**
 * Ajusta la URL de la base para el pooler de Supabase.
 *
 * Por qué hace falta en producción y no solo en desarrollo:
 *
 * El pooler de Supabase tiene un tope de conexiones simultáneas por proyecto.
 * Prisma, sin `connection_limit`, abre `núcleos × 2 + 1` conexiones. Dentro de
 * un contenedor ese número sale del host, no del contenedor, y termina
 * abriendo más conexiones de las que el pooler acepta. Cuando se pasa de la
 * cuota, Prisma lanza y el endpoint responde 500 "Error interno" de forma
 * intermitente: unas reservas entran y otras no, sin patrón aparente.
 *
 * En desarrollo se deja en 1 porque `next dev` levanta varios procesos a la
 * vez y cada uno abriría su propio juego de conexiones.
 *
 * `pgbouncer=true` solo hace falta en modo transaccional (puerto 6543): ahí el
 * pooler no admite sentencias preparadas. En modo sesión (5432) no se pone,
 * porque ahí sí las admite y Prisma las aprovecha.
 */
function datasourceUrl(): string | undefined {
  const value = process.env.DATABASE_URL;
  if (!value) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Una URL que no se puede parsear se devuelve tal cual: que la reporte
    // Prisma con su propio mensaje, que es más claro que uno nuestro.
    return value;
  }

  if (url.hostname.endsWith(".pooler.supabase.com")) {
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        process.env.NODE_ENV === "development" ? "1" : "5",
      );
    }

    const modoTransaccional = url.port === "6543";
    if (modoTransaccional && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
  }

  return url.toString();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
