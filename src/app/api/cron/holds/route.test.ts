import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  liberarHoldsVencidos: vi.fn(),
  obtenerContactoAviso: vi.fn(),
  sendHoldExpiradoEmail: vi.fn(),
}));

vi.mock("@/features/reservations/reservations.service", () => ({
  liberarHoldsVencidos: mocks.liberarHoldsVencidos,
}));
vi.mock("@/features/payments/payments.repository", () => ({
  obtenerContactoAviso: mocks.obtenerContactoAviso,
}));
// `@/lib/email/resend` es server-only: se mockea igual que en payments.
vi.mock("@/lib/email/resend", () => ({
  sendHoldExpiradoEmail: mocks.sendHoldExpiradoEmail,
}));
vi.mock("@/shared/lib/db", () => ({ db: {} }));

// La ruta lee CRON_SECRET al importarse: hay que fijarlo antes de cargarla.
async function cargarRuta() {
  process.env.CRON_SECRET = "secreto-test";
  vi.resetModules();
  return (await import("@/app/api/cron/holds/route")).GET;
}

function peticion(authorization?: string) {
  return new Request("http://localhost/api/cron/holds", {
    headers: authorization ? { authorization } : {},
  }) as never;
}

const contactoBase = {
  email: "cliente@ejemplo.com",
  nombre: "Ana López",
  startsAt: new Date("2026-11-01T13:00:00Z"),
  servicio: "Piscina adultos 1",
  totalCop: 24000,
};

describe("GET /api/cron/holds (Fase 3.1: aviso de hold expirado)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.liberarHoldsVencidos.mockResolvedValue(0);
    mocks.obtenerContactoAviso.mockResolvedValue(contactoBase);
    mocks.sendHoldExpiradoEmail.mockResolvedValue(undefined);
  });

  it("rechaza sin autorización", async () => {
    const GET = await cargarRuta();

    const res = await GET(peticion("Bearer otro-secreto"));

    expect(res.status).toBe(401);
    expect(mocks.liberarHoldsVencidos).not.toHaveBeenCalled();
  });

  it("barre sin límite y avisa a cada expirada", async () => {
    mocks.liberarHoldsVencidos.mockImplementation(
      async (_now: unknown, _db: unknown, limite: number | null, alExpirar?: (id: string) => void) => {
        await alExpirar?.("res-1");
        await alExpirar?.("res-2");
        return 2;
      },
    );
    const GET = await cargarRuta();

    const res = await GET(peticion("Bearer secreto-test"));
    const body = await res.json();

    expect(mocks.liberarHoldsVencidos).toHaveBeenCalledWith(
      expect.any(Date),
      expect.anything(),
      null,
      expect.any(Function),
    );
    expect(body.data).toMatchObject({ liberadas: 2, notificados: 2 });
    expect(mocks.sendHoldExpiradoEmail).toHaveBeenCalledWith(
      "cliente@ejemplo.com",
      expect.objectContaining({ nombre: "Ana López", servicio: "Piscina adultos 1" }),
    );
  });

  it("no tumba el cron si un correo falla y omite sin contacto", async () => {
    mocks.liberarHoldsVencidos.mockImplementation(
      async (_now: unknown, _db: unknown, _limite: number | null, alExpirar?: (id: string) => void) => {
        await alExpirar?.("res-1");
        await alExpirar?.("res-2");
        return 2;
      },
    );
    mocks.obtenerContactoAviso
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(contactoBase);
    mocks.sendHoldExpiradoEmail.mockRejectedValueOnce(new Error("Resend caído"));
    const GET = await cargarRuta();

    const res = await GET(peticion("Bearer secreto-test"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ liberadas: 2, notificados: 0 });
  });
});
