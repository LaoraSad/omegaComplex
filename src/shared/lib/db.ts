// -----------------------------------------------------------------------------
// src/shared/lib/db.ts
// Cliente Prisma único (singleton) para acceso a la base de datos PostgreSQL.
// Evita crear múltiples instancias de PrismaClient durante el hot-reload (HMR)
// en desarrollo, lo que agotaría el pool de conexiones.
// -----------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";

// -----------------------------------------------------------------------------
// datasourceUrl()
// Ajusta la URL de la base de datos cuando se usa el pooler de Supabase.
// Propósito: evitar agotar el límite de conexiones simultáneas del pooler.
//   - En desarrollo (next dev), Next levanta varios procesos; cada uno abriría
//     su propio pool, por lo que se usa connection_limit=1.
//   - En producción se usa connection_limit=5.
//   - Si el puerto es 6543 (modo transaccional de pgbouncer), se añade
//     pgbouncer=true porque ese modo no admite sentencias preparadas.
//   - Si la URL no es de Supabase o no se puede parsear, se devuelve tal cual.
// -----------------------------------------------------------------------------
function datasourceUrl(): string | undefined {
  const value = process.env.DATABASE_URL;
  if (!value) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Si la URL no se puede parsear, se devuelve tal cual para que Prisma
    // reporte su propio mensaje de error (más claro).
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

// -----------------------------------------------------------------------------
// globalForPrisma
// Referencia global para almacenar la instancia de PrismaClient en desarrollo.
// Esto evita que cada recarga de HMR cree una nueva conexión a la base.
// -----------------------------------------------------------------------------
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// -----------------------------------------------------------------------------
// db (exportación principal)
// Instancia única de PrismaClient.
//   - En desarrollo: se reusa desde globalThis.prisma si ya existe.
//   - En producción: se crea una nueva instancia por contenedor (no hay HMR).
//   - Se le pasa la URL ajustada por datasourceUrl().
// -----------------------------------------------------------------------------
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
