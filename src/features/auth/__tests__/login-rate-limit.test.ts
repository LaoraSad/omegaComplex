import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pruebas del límite de intentos de login.
 *
 * El `db` se simula con un almacén en memoria que soporta solo las dos
 * operaciones que usa el módulo (`count` y `create`), para no depender de la
 * base real ni de reloj real: las ventanas se fabrican moviendo `createdAt`.
 */
const mocks = vi.hoisted(() => {
  type Fila = { email: string; ip: string | null; success: boolean; createdAt: Date };
  type Where = {
    email?: string;
    ip?: string | null;
    success?: boolean;
    createdAt?: { gte?: Date; lt?: Date };
  };

  const filas: Fila[] = [];
  const db = {
    loginAttempt: {
      create: vi.fn(async ({ data }: { data: Omit<Fila, "createdAt"> }) => {
        const fila = { ...data, createdAt: new Date() };
        filas.push(fila);
        return fila;
      }),
      count: vi.fn(async ({ where }: { where: Where }) => {
        return filas.filter((f) => {
          if (where.email !== undefined && f.email !== where.email) return false;
          if (where.ip !== undefined && f.ip !== where.ip) return false;
          if (where.success !== undefined && f.success !== where.success) return false;
          if (where.createdAt?.gte && f.createdAt < where.createdAt.gte) return false;
          return true;
        }).length;
      }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };

  return { filas, db };
});

vi.mock("@/shared/lib/db", () => ({ db: mocks.db }));

import {
  MAX_CUENTAS_POR_IP,
  MAX_INTENTOS_POR_VENTANA,
  VENTANA_INTENTOS_MS,
  ipDesdeHeaders,
  registrarIntento,
  verificarLimiteIntentos,
} from "../login-rate-limit";

const correo = "objetivo@example.com";

/** Crea `n` fallos para un correo desde una IP, todos dentro de la ventana. */
async function fallar(n: number, email = correo, ip: string | null = "1.1.1.1") {
  for (let i = 0; i < n; i++) {
    await registrarIntento(email, ip, false);
  }
}

describe("límite de intentos de login", () => {
  beforeEach(() => {
    mocks.filas.length = 0;
    mocks.db.loginAttempt.create.mockClear();
    mocks.db.loginAttempt.count.mockClear();
  });

  it("deja pasar el primer intento", async () => {
    await expect(verificarLimiteIntentos(correo, "1.1.1.1")).resolves.toBeUndefined();
  });

  it("deja pasar los intentos que están justo por debajo del límite", async () => {
    await fallar(MAX_INTENTOS_POR_VENTANA - 1);
    await expect(verificarLimiteIntentos(correo, "1.1.1.1")).resolves.toBeUndefined();
  });

  it("bloquea en cuanto se alcanza el límite de esa cuenta", async () => {
    await fallar(MAX_INTENTOS_POR_VENTANA);
    await expect(verificarLimiteIntentos(correo, "1.1.1.1")).rejects.toMatchObject({
      status: 429,
      code: "TOO_MANY_LOGIN_ATTEMPTS",
    });
  });

  it("bloquea una cuenta distinta atacada desde la misma IP", async () => {
    // El atacante prueba muchos correos, uno por cada intento: por correo solo
    // nunca llegaría al tope, pero la IP delata el barrido.
    for (let i = 0; i < MAX_CUENTAS_POR_IP; i++) {
      await fallar(1, `victima-${i}@example.com`, "9.9.9.9");
    }
    await expect(verificarLimiteIntentos("victima-nueva@example.com", "9.9.9.9")).rejects.toMatchObject({
      status: 429,
    });
  });

  it("no se puede esquivar el bloqueo de una cuenta cambiando de IP", async () => {
    // El tope por correo es por cuenta, no por conexión. Si dependiera de la IP,
    // un atacante podría "desbloquear" a la víctima cambiando de IP y usarla
    // para un ataque de denegación de servicio, además de esquivar el límite.
    await fallar(MAX_INTENTOS_POR_VENTANA, correo, "9.9.9.9");
    await expect(verificarLimiteIntentos(correo, "8.8.8.8")).rejects.toMatchObject({
      status: 429,
    });
  });

  it("vuelve a admitir el acceso cuando expira la ventana", async () => {
    await fallar(MAX_INTENTOS_POR_VENTANA);
    await expect(verificarLimiteIntentos(correo, "1.1.1.1")).rejects.toMatchObject({ status: 429 });

    // Los fallos viejos se caen de la ventana al pasar los 15 minutos.
    const vencido = Date.now() - VENTANA_INTENTOS_MS - 1000;
    mocks.filas.forEach((f) => {
      f.createdAt = new Date(vencido);
    });

    await expect(verificarLimiteIntentos(correo, "1.1.1.1")).resolves.toBeUndefined();
  });

  it("no cuenta los intentos exitosos", async () => {
    // El titular que sí sabe la contraseña no debe bloquearse a sí mismo.
    for (let i = 0; i < MAX_INTENTOS_POR_VENTANA + 5; i++) {
      await registrarIntento(correo, "1.1.1.1", true);
    }
    await expect(verificarLimiteIntentos(correo, "1.1.1.1")).resolves.toBeUndefined();
  });

  it("no rompe el login si el registro del intento falla", async () => {
    mocks.db.loginAttempt.create.mockRejectedValueOnce(new Error("base caida"));
    await expect(registrarIntento(correo, "1.1.1.1", false)).resolves.toBeUndefined();
  });

  it("normaliza el correo a minúsculas", async () => {
    await fallar(MAX_INTENTOS_POR_VENTANA, "Objetivo@Example.COM", "1.1.1.1");
    await expect(verificarLimiteIntentos(correo, "1.1.1.1")).rejects.toMatchObject({ status: 429 });
  });

  it("omite el límite por IP cuando la petición no trae cabecera de origen", async () => {
    await fallar(MAX_CUENTAS_POR_IP + 5, "a@example.com", null);
    await expect(verificarLimiteIntentos("b@example.com", null)).resolves.toBeUndefined();
  });
});

describe("ipDesdeHeaders", () => {
  it("toma la primera IP de x-forwarded-for, que es la del cliente", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" });
    expect(ipDesdeHeaders(h)).toBe("203.0.113.7");
  });

  it("cae a x-real-ip cuando no hay x-forwarded-for", () => {
    expect(ipDesdeHeaders(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("devuelve null si no hay ninguna cabecera", () => {
    expect(ipDesdeHeaders(new Headers())).toBeNull();
  });
});