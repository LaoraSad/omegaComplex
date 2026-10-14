import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/shared/lib/db", () => ({
  db: { $queryRaw: mocks.queryRaw },
}));

import { getConteosReportes } from "../admin.repository";

describe("getConteosReportes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.queryRaw.mockResolvedValue([
      { total: BigInt(10) },
      { total: BigInt(20) },
      { total: BigInt(3) },
      { total: BigInt(4) },
      { total: BigInt(50) },
    ]);
  });

  it("devuelve los 5 totales en un solo roundtrip (sin traer filas)", async () => {
    await expect(getConteosReportes()).resolves.toEqual({
      reservas: 10,
      accesos: 20,
      servicios: 3,
      empleados: 4,
      clientes: 50,
    });
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
    const consulta = String(mocks.queryRaw.mock.calls[0][0]);
    expect(consulta).toMatch(/UNION ALL/);
  });
});
