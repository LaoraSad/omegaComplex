import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ user: { update: vi.fn() } }));

vi.mock("@/shared/lib/db", () => ({ db: dbMock }));

import { updateUserPassword } from "../auth.repository";

describe("updateUserPassword (P1-5)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.user.update.mockResolvedValue({});
  });

  it("cambia el hash y sube tokenVersion para revocar sesiones", async () => {
    await updateUserPassword("u-1", "nuevo-hash");

    expect(dbMock.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { passwordHash: "nuevo-hash", tokenVersion: { increment: 1 } },
    });
  });
});
