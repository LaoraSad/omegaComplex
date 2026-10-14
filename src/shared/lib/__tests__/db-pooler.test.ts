// Comprobacion de que el ajuste del pooler se aplica bien.
import { describe, expect, it, beforeEach, afterEach } from "vitest";

/** Copia de la logica de src/shared/lib/db.ts, expuesta para probarla. */
function datasourceUrl(value: string | undefined, nodeEnv: string): string | undefined {
  if (!value) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (url.hostname.endsWith(".pooler.supabase.com")) {
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", nodeEnv === "development" ? "1" : "5");
    }
    const modoTransaccional = url.port === "6543";
    if (modoTransaccional && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
  }

  return url.toString();
}

const POOLER_5432 =
  "postgresql://postgres.proj:clave@aws-0-us-west-2.pooler.supabase.com:5432/postgres";
const POOLER_6543 =
  "postgresql://postgres.proj:clave@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

describe("ajuste del pooler de Supabase", () => {
  const envOriginal = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    // NODE_ENV es de solo lectura para TypeScript, aunque en el proceso se
    // pueda reasignar.
    (process.env as Record<string, string | undefined>).NODE_ENV = envOriginal;
  });

  it("limita las conexiones en PRODUCCION (que es donde fallaba)", () => {
    const url = new URL(datasourceUrl(POOLER_5432, "production")!);
    expect(url.searchParams.get("connection_limit")).toBe("5");
  });

  it("limita a 1 en desarrollo, porque next dev levanta varios procesos", () => {
    const url = new URL(datasourceUrl(POOLER_5432, "development")!);
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("respeta el limite que venga puesto a mano", () => {
    const con =
      "postgresql://postgres.proj:clave@aws-0-us-west-2.pooler.supabase.com:5432/postgres?connection_limit=9";
    const url = new URL(datasourceUrl(con, "production")!);
    expect(url.searchParams.get("connection_limit")).toBe("9");
  });

  it("activa pgbouncer solo en modo transaccional (6543)", () => {
    const trans = new URL(datasourceUrl(POOLER_6543, "production")!);
    expect(trans.searchParams.get("pgbouncer")).toBe("true");

    // En modo sesion (5432) no se pone: ahi si hay sentencias preparadas.
    const sesion = new URL(datasourceUrl(POOLER_5432, "production")!);
    expect(sesion.searchParams.has("pgbouncer")).toBe(false);
  });

  it("no toca una base normal que no sea de Supabase", () => {
    const local = "postgresql://usuario:clave@localhost:5432/omega";
    expect(datasourceUrl(local, "production")).toBe(local);
  });

  it("no explota si la URL esta mal escrita", () => {
    const rota = "no-es-una-url";
    expect(datasourceUrl(rota, "production")).toBe(rota);
  });
});