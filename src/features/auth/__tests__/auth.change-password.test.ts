import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findUserCredentialsById: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock("../auth.repository", () => ({
  findUserCredentialsById: mocks.findUserCredentialsById,
  updateUserPassword: mocks.updateUserPassword,
}));

import { UnauthorizedError } from "@/shared/http/errors";
import { changePassword } from "../auth.service";

describe("changePassword", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("actualiza el hash cuando la actual es correcta", async () => {
    const hash = await bcrypt.hash("Actual123", 4);
    mocks.findUserCredentialsById.mockResolvedValue({ id: "u-1", passwordHash: hash, isActive: true });

    await changePassword("u-1", { currentPassword: "Actual123", newPassword: "Nueva4567" });

    expect(mocks.updateUserPassword).toHaveBeenCalledOnce();
    const [id, nuevoHash] = mocks.updateUserPassword.mock.calls[0];
    expect(id).toBe("u-1");
    expect(await bcrypt.compare("Nueva4567", nuevoHash)).toBe(true);
  });

  it("rechaza actual incorrecta, usuario inexistente o inactivo", async () => {
    const hash = await bcrypt.hash("Actual123", 4);
    mocks.findUserCredentialsById.mockResolvedValue({ id: "u-1", passwordHash: hash, isActive: true });
    await expect(
      changePassword("u-1", { currentPassword: "Otra9999", newPassword: "Nueva4567" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mocks.updateUserPassword).not.toHaveBeenCalled();

    mocks.findUserCredentialsById.mockResolvedValue(null);
    await expect(
      changePassword("u-1", { currentPassword: "Actual123", newPassword: "Nueva4567" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    mocks.findUserCredentialsById.mockResolvedValue({ id: "u-1", passwordHash: hash, isActive: false });
    await expect(
      changePassword("u-1", { currentPassword: "Actual123", newPassword: "Nueva4567" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
