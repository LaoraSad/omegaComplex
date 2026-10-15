import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({
  value: undefined as string | undefined,
  set: vi.fn(),
  delete: vi.fn(),
}));
const headersMock = vi.hoisted(() => ({ get: vi.fn() }));
const dbMock = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "session" && jar.value ? { value: jar.value } : undefined,
    set: jar.set,
    delete: jar.delete,
  }),
  headers: async () => headersMock,
}));
vi.mock("@/shared/lib/db", () => ({ db: dbMock }));

import { createToken, verifyToken } from "../jwt";
import { createSession, getSession } from "../session";

process.env.JWT_SECRET = "session-test-secret-con-mas-de-32-caracteres";

describe("sesiones con tokenVersion (P1-5)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    jar.value = undefined;
    headersMock.get.mockReturnValue(null);
  });

  it("el token lleva la versión vigente al crearse", async () => {
    dbMock.user.findUnique.mockResolvedValue({ tokenVersion: 3 });

    await createSession("u-1", "user");

    const token = jar.set.mock.calls[0][1] as string;
    expect(await verifyToken(token)).toMatchObject({ userId: "u-1", role: "user", tv: 3 });
  });

  it("getSession acepta el token vigente de un activo", async () => {
    jar.value = await createToken({ userId: "u-1", role: "user", tv: 3 });
    dbMock.user.findUnique.mockResolvedValue({ isActive: true, tokenVersion: 3 });

    expect(await getSession()).toEqual({ userId: "u-1", role: "user" });
  });

  it("revoca el token si la contraseña cambió después", async () => {
    jar.value = await createToken({ userId: "u-1", role: "user", tv: 3 });
    dbMock.user.findUnique.mockResolvedValue({ isActive: true, tokenVersion: 4 });

    expect(await getSession()).toBeNull();
  });

  it("revoca el token si la cuenta se desactivó", async () => {
    jar.value = await createToken({ userId: "u-1", role: "user", tv: 3 });
    dbMock.user.findUnique.mockResolvedValue({ isActive: false, tokenVersion: 3 });

    expect(await getSession()).toBeNull();
  });

  it("rechaza tokens legacy sin versión (re-login tras el despliegue)", async () => {
    const { SignJWT } = await import("jose");
    const legacy = await new SignJWT({ userId: "u-1", role: "user" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    jar.value = legacy;

    expect(await getSession()).toBeNull();
  });
});
