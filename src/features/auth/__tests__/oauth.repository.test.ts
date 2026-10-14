import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  role: { findFirst: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
  user: { create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  customer: { create: vi.fn() },
  oAuthAccount: { findUnique: vi.fn(), create: vi.fn() },
  $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(dbMock)),
}));

vi.mock("@/shared/lib/db", () => ({ db: dbMock }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hash") } }));

import {
  createUserFromOAuth,
  findOAuthAccount,
  linkOAuthAccount,
} from "../oauth.repository";

const PERFIL = {
  providerAccountId: "google-sub-1",
  email: "ANA@x.co",
  firstName: "Ana",
  lastName: "López",
  emailVerified: true,
};

describe("oauth.repository (P1-4: isActive + emailVerified viajan)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.$transaction.mockImplementation((cb: (t: unknown) => unknown) => cb(dbMock));
  });

  it("findOAuthAccount devuelve actividad y verificación del usuario", async () => {
    dbMock.oAuthAccount.findUnique.mockResolvedValue({
      user: {
        id: "u-1",
        email: "ana@x.co",
        firstName: "Ana",
        lastName: "López",
        phone: null,
        isActive: false,
        emailVerified: true,
        role: { name: "user" },
      },
    });

    const r = await findOAuthAccount("google", "google-sub-1");

    expect(r).toMatchObject({ id: "u-1", role: "user", isActive: false, emailVerified: true });
  });

  it("crear respeta si Google no verificó el correo", async () => {
    dbMock.role.findFirst.mockResolvedValue({ id: "rol-user" });
    dbMock.user.create.mockResolvedValue({ id: "u-2", roleId: "rol-user", phone: null });
    dbMock.role.findUniqueOrThrow.mockResolvedValue({ name: "user" });

    const r = await createUserFromOAuth("google", { ...PERFIL, emailVerified: false });

    expect(dbMock.user.create.mock.calls[0][0].data).toMatchObject({ emailVerified: false });
    expect(r).toMatchObject({ isActive: true, emailVerified: false, isNewUser: true });
  });

  it("vincular marca verificado solo si Google lo garantiza", async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "u-3",
      email: "ana@x.co",
      firstName: "Ana",
      lastName: "López",
      phone: null,
      isActive: true,
      emailVerified: false,
      role: { name: "user" },
    });

    await linkOAuthAccount("u-3", "google", { ...PERFIL, emailVerified: false });
    expect(dbMock.user.updateMany).not.toHaveBeenCalled();

    const r = await linkOAuthAccount("u-3", "google", PERFIL);
    expect(dbMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u-3", emailVerified: false },
      data: { emailVerified: true },
    });
    expect(r).toMatchObject({ isActive: true });
  });
});
