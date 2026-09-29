// Cliente Prisma único (singleton para dev/HMR).
// TODO(T2,T3): importar @prisma/client cuando se instale y definir modelos en schema.prisma.
// import { PrismaClient } from "@prisma/client";
// const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
// export const db = globalForPrisma.prisma ?? new PrismaClient();
// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
export const db = null as unknown;
