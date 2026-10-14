import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serviceSlot: { findMany: vi.fn() },
  reservation: { count: vi.fn() },
}));

vi.mock("@/shared/lib/db", () => ({
  db: { serviceSlot: mocks.serviceSlot, reservation: mocks.reservation },
}));

import { getOcupacionPorFecha, getUsoReservas } from "../admin.repository";

describe("getOcupacionPorFecha", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.serviceSlot.findMany.mockResolvedValue([
      { capacity: 10, bookedCount: 6, heldCount: 1, service: { id: "a", name: "Piscina" } },
    ]);
  });

  it("consulta las franjas del día Bogotá pedido y agrega igual que hoy", async () => {
    const result = await getOcupacionPorFecha("2026-10-20");

    expect(mocks.serviceSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          startsAt: {
            gte: new Date("2026-10-20T05:00:00.000Z"),
            lt: new Date("2026-10-21T05:00:00.000Z"),
          },
        },
      }),
    );
    expect(result).toMatchObject({
      fecha: "2026-10-20",
      occupancyToday: { used: 7, total: 10 },
    });
    expect(result.occupancyByService).toHaveLength(1);
  });

  it("fecha inválida cae a hoy", async () => {
    const result = await getOcupacionPorFecha("no-fecha");

    expect(mocks.serviceSlot.findMany).toHaveBeenCalledOnce();
    expect(result.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.occupancyToday).toEqual({ used: 7, total: 10 });
  });
});

describe("getUsoReservas (definición estricta)", () => {
  // 2026-10-14 07:00 COT.
  const AHORA = new Date("2026-10-14T12:00:00Z");

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.reservation.count.mockResolvedValue(0);
  });

  it("usadas = used; no usadas = confirmed pasadas sin ningún QR consumido", async () => {
    mocks.reservation.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);

    const result = await getUsoReservas("2026-10-01", "2026-10-14", AHORA);

    expect(result).toEqual({ usadas: 4, noUsadas: 2 });
    const [usadasWhere, noUsadasWhere] = mocks.reservation.count.mock.calls.map((c) => c[0].where);
    expect(usadasWhere).toMatchObject({ status: "used" });
    expect(noUsadasWhere).toMatchObject({
      status: "confirmed",
      endsAt: { lt: AHORA },
      qrTokens: { none: { usedAt: { not: null } } },
    });
    // Ambas acotadas al rango por fecha de franja.
    for (const where of [usadasWhere, noUsadasWhere]) {
      expect(where.startsAt).toMatchObject({
        gte: new Date("2026-10-01T05:00:00.000Z"),
        lt: new Date("2026-10-15T05:00:00.000Z"),
      });
    }
  });
});
