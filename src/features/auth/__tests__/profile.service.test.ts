import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findUserEmailById: vi.fn(),
  findUserByEmail: vi.fn(),
  updateUserPhone: vi.fn(),
  updateUserEmailPendingVerification: vi.fn(),
  issueVerificationCode: vi.fn(),
}));

vi.mock("../auth.repository", () => ({
  findUserEmailById: mocks.findUserEmailById,
  findUserByEmail: mocks.findUserByEmail,
  updateUserPhone: mocks.updateUserPhone,
  updateUserEmailPendingVerification: mocks.updateUserEmailPendingVerification,
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock("../email-flow.service", () => ({
  issueVerificationCode: mocks.issueVerificationCode,
}));

import { ConflictError, UnauthorizedError } from "@/shared/http/errors";
import { updateProfile } from "../auth.service";

describe("updateProfile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findUserEmailById.mockResolvedValue({ id: "u-1", email: "actual@ejemplo.com", isActive: true });
    mocks.findUserByEmail.mockResolvedValue(null);
    mocks.updateUserPhone.mockResolvedValue(undefined);
    mocks.updateUserEmailPendingVerification.mockResolvedValue(undefined);
    mocks.issueVerificationCode.mockResolvedValue(undefined);
  });

  it("actualiza solo el teléfono sin tocar el correo", async () => {
    const result = await updateProfile("u-1", { phone: "+573001234567" });

    expect(result).toMatchObject({ phoneUpdated: true, emailChanged: false });
    expect(mocks.updateUserPhone).toHaveBeenCalledWith("u-1", "+573001234567");
    expect(mocks.updateUserEmailPendingVerification).not.toHaveBeenCalled();
    expect(mocks.issueVerificationCode).not.toHaveBeenCalled();
  });

  it("cambia el correo normalizado, pide re-verificación y emite código nuevo", async () => {
    const result = await updateProfile("u-1", { email: "Nuevo@Ejemplo.com" });

    expect(result).toMatchObject({
      phoneUpdated: false,
      emailChanged: true,
      newEmail: "nuevo@ejemplo.com",
      verificationEmailSent: true,
    });
    expect(mocks.updateUserEmailPendingVerification).toHaveBeenCalledWith("u-1", "nuevo@ejemplo.com");
    expect(mocks.issueVerificationCode).toHaveBeenCalledWith({ id: "u-1", email: "nuevo@ejemplo.com" });
  });

  it("no hace nada con el correo cuando es el mismo ignorando mayúsculas", async () => {
    const result = await updateProfile("u-1", { email: "Actual@Ejemplo.com" });

    expect(result.emailChanged).toBe(false);
    expect(mocks.updateUserEmailPendingVerification).not.toHaveBeenCalled();
    expect(mocks.issueVerificationCode).not.toHaveBeenCalled();
  });

  it("rechaza correo de otro usuario sin revelar detalles", async () => {
    mocks.findUserByEmail.mockResolvedValue({ id: "u-2", email: "otro@ejemplo.com" });

    await expect(updateProfile("u-1", { email: "otro@ejemplo.com" })).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.updateUserEmailPendingVerification).not.toHaveBeenCalled();
  });

  it("convierte la carrera en unique (P2002) en conflicto genérico", async () => {
    mocks.updateUserEmailPendingVerification.mockRejectedValue({ code: "P2002" });

    await expect(updateProfile("u-1", { email: "nuevo@ejemplo.com" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("marca verificación no enviada si el correo de código falla, pero el cambio queda", async () => {
    mocks.issueVerificationCode.mockRejectedValue(new Error("smtp caído"));

    const result = await updateProfile("u-1", { email: "nuevo@ejemplo.com" });

    expect(result).toMatchObject({ emailChanged: true, verificationEmailSent: false });
  });

  it("rechaza usuario inexistente o inactivo", async () => {
    mocks.findUserEmailById.mockResolvedValue(null);
    await expect(updateProfile("u-1", { phone: "+573001234567" })).rejects.toBeInstanceOf(UnauthorizedError);

    mocks.findUserEmailById.mockResolvedValue({ id: "u-1", email: "a@b.com", isActive: false });
    await expect(updateProfile("u-1", { phone: "+573001234567" })).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
