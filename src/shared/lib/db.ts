// Cliente Prisma único (singleton para dev/HMR).
// TODO(T2,T3): importar @prisma/client cuando se instale y definir modelos en schema.prisma.
// import { PrismaClient } from "@prisma/client";
// const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
// export const db = globalForPrisma.prisma ?? new PrismaClient();
// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
import { PrismaClient } from "@prisma/client";

function developmentDatasourceUrl(): string | undefined {
  const value = process.env.DATABASE_URL;
  if (!value || process.env.NODE_ENV !== "development") return value;

  const url = new URL(value);
  if (
    url.hostname.endsWith(".pooler.supabase.com") &&
    !url.searchParams.has("connection_limit")
  ) {
    url.searchParams.set("connection_limit", "1");
  }
  return url.toString();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: developmentDatasourceUrl() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
