import { createHash, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    emailVerification: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordReset: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mail: {
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendWelcomeEmail: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/shared/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/email/resend", () => mocks.mail);

import {
  completePasswordReset,
  issueVerificationCode,
  verifyEmailCode,
} from "../email-flow.service";

const secret = "email-flow-test-secret-with-more-than-32-chars";
const userId = "user-1";
const testEmail = "client@example.com";

function codeHash(code: string): string {
  return createHmac("sha256", secret).update(code).digest("hex");
}

function verificationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "verification-1",
    userId,
    codeHash: codeHash("583214"),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    usedAt: null,
    attempts: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("email auth flows", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.JWT_SECRET = secret;
    mocks.db.emailVerification.count.mockResolvedValue(0);
    mocks.db.passwordReset.count.mockResolvedValue(0);
    mocks.db.emailVerification.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.passwordReset.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.db));
    mocks.mail.sendVerificationEmail.mockResolvedValue(undefined);
    mocks.mail.sendPasswordResetEmail.mockResolvedValue(undefined);
    mocks.mail.sendWelcomeEmail.mockResolvedValue(undefined);
  });

  it("genera un código aleatorio de seis dígitos y solo persiste su hash", async () => {
    mocks.db.emailVerification.findFirst.mockResolvedValue(null);
    mocks.db.emailVerification.create.mockImplementation(async ({ data }) => ({ id: "verification-1", ...data }));

    await issueVerificationCode({ id: userId, email: testEmail });

    const [sentTo, code] = mocks.mail.sendVerificationEmail.mock.calls[0];
    const stored = mocks.db.emailVerification.create.mock.calls[0][0].data;
    expect(sentTo).toBe(testEmail);
    expect(code).toMatch(/^\d{6}$/);
    expect(["000000", "111111", "123456"]).not.toContain(code);
    expect(stored.codeHash).not.toBe(code);
    expect(stored.codeHash).toBe(codeHash(code));
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rechaza el código incorrecto y aumenta el contador de intentos", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ id: userId, emailVerified: false });
    mocks.db.emailVerification.findFirst
      .mockResolvedValueOnce(verificationRecord())
      .mockResolvedValueOnce(null);

    await expect(verifyEmailCode(testEmail, "999999")).rejects.toMatchObject({ code: "INVALID_CODE" });
    expect(mocks.db.emailVerification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } }),
    );
  });

  it("rechaza un código expirado", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ id: userId, emailVerified: false });
    mocks.db.emailVerification.findFirst.mockResolvedValue(
      verificationRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(verifyEmailCode(testEmail, "583214")).rejects.toMatchObject({ code: "CODE_EXPIRED" });
    expect(mocks.db.emailVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) }),
    );
  });

  it("invalida el código anterior después de emitir uno nuevo", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ id: userId, emailVerified: false });
    mocks.db.emailVerification.findFirst
      .mockResolvedValueOnce(verificationRecord({ codeHash: codeHash("654321") }))
      .mockResolvedValueOnce({ id: "old-verification" });

    await expect(verifyEmailCode(testEmail, "583214")).rejects.toMatchObject({ code: "CODE_USED" });
    expect(mocks.db.emailVerification.updateMany).not.toHaveBeenCalled();
  });

  it("bloquea después de cinco intentos", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ id: userId, emailVerified: false });
    mocks.db.emailVerification.findFirst.mockResolvedValue(verificationRecord({ attempts: 5 }));

    await expect(verifyEmailCode(testEmail, "999999")).rejects.toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
  });

  it("rechaza un token de recuperación vencido y lo invalida", async () => {
    const token = "ab".repeat(32);
    mocks.db.passwordReset.findUnique.mockResolvedValue({
      id: "reset-1",
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });

    await expect(completePasswordReset(token, "NuevaClave123")).rejects.toMatchObject({ code: "RESET_TOKEN_EXPIRED" });
    expect(mocks.db.passwordReset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedAt: expect.any(Date) } }),
    );
  });

  it("rechaza el segundo uso de un token de recuperación", async () => {
    const token = "cd".repeat(32);
    mocks.db.passwordReset.findUnique.mockResolvedValue({
      id: "reset-1",
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });

    await expect(completePasswordReset(token, "NuevaClave123")).rejects.toMatchObject({ code: "RESET_TOKEN_USED" });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});