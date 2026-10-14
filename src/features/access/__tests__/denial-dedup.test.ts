import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ access: { count: vi.fn() } }));

vi.mock("@/shared/lib/db", () => ({ db: dbMock }));

import { huboDenegacionReciente } from "../access.repository";

describe("huboDenegacionReciente (P2-6: freno al spam de denied)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("busca el mismo QR, empleado y motivo en los últimos 5 minutos", async () => {
    dbMock.access.count.mockResolvedValue(2);
    const antes = Date.now();

    const r = await huboDenegacionReciente({
      qrTokenId: "qr-1",
      employeeId: "emp-1",
      reason: "fuera de horario",
    });

    expect(r).toBe(true);
    const where = dbMock.access.count.mock.calls[0][0].where;
    expect(where).toMatchObject({
      qrTokenId: "qr-1",
      employeeId: "emp-1",
      result: "denied",
      denialReason: "fuera de horario",
    });
    const gte = where.accessedAt.gte as Date;
    expect(gte.getTime()).toBeGreaterThanOrEqual(antes - 5 * 60 * 1000 - 1000);
    expect(gte.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("sin filas recientes deja registrar", async () => {
    dbMock.access.count.mockResolvedValue(0);

    expect(
      await huboDenegacionReciente({ qrTokenId: "qr-1", employeeId: "emp-1", reason: "x" }),
    ).toBe(false);
  });
});
