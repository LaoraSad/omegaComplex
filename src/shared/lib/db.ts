// Cliente Prisma único (singleton para dev y producción).
// Usa globalThis para persistencia across HMR (Turbopack).
// Una sola instancia por proceso. Evita crear múltiples clientes que agotan
// las conexiones del pooler de Supabase (límite: 15 sesiones).
import { PrismaClient } from "@prisma/client";

// Declaración extendida de globalThis para TypeScript saber de prisma
declare global {
  var prisma: PrismaClient | undefined;
}

// Singleton: usa ??= (nullish assignment) solo si global.prisma es null/undefined.
// En desarrollo: persiste across Turbopack HMR.
// En producción: una sola instancia por proceso.
export const db = global.prisma ??= new PrismaClient();