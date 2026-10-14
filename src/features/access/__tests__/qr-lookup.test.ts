import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findFirst } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/shared/lib/db", () => ({
  db: { qrToken: { findUnique, findFirst } },
}));

import { findQrByTokenHash } from "../access.repository";

describe("findQrByTokenHash (P0-4: solo token seguro o código corto)", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockReset();
    findUnique.mockResolvedValue(null);
  });

  it("un UUID que no es token devuelve null sin buscar por id/reservationId", async () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const r = await findQrByTokenHash(uuid);
    expect(r).toBeNull();
    // Solo se consultó por tokenHash: el bypass por id/reservationId ya no existe.
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique.mock.calls[0][0].where).toHaveProperty("tokenHash");
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("un texto cualquiera devuelve null sin tocar reservationId", async () => {
    const r = await findQrByTokenHash("este-codigo-no-existe");
    expect(r).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
