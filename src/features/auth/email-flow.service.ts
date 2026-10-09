import "server-only";

import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/shared/lib/db";
import { HttpError } from "@/shared/http/errors";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "@/lib/email/resend";

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_EMAILS_PER_HOUR = 3;
const MAX_VERIFICATION_ATTEMPTS = 5;

function hashVerificationCode(code: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && secret.length < 32)) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres en producción");
  }
  return createHmac("sha256", secret ?? "omega-development-only-pepper")
    .update(code)
    .digest("hex");
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function enforceEmailRateLimit(
  model: "emailVerification" | "passwordReset",
  userId: string,
): Promise<void> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const where = { userId, createdAt: { gte: since } };
  const count =
    model === "emailVerification"
      ? await db.emailVerification.count({ where })
      : await db.passwordReset.count({ where });
  if (count >= MAX_EMAILS_PER_HOUR) {
    throw new HttpError(429, "RATE_LIMITED", "Demasiadas solicitudes. Intenta de nuevo más tarde.");
  }
}

export async function issueVerificationCode(
  user: { id: string; email: string },
): Promise<void> {
  await enforceEmailRateLimit("emailVerification", user.id);
  const now = new Date();
  let code = "";
  let codeHash = "";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    if (["000000", "111111", "123456"].includes(code)) continue;
    codeHash = hashVerificationCode(code);
    const collision = await db.emailVerification.findFirst({
      where: { codeHash, usedAt: null, expiresAt: { gt: now } },
      select: { id: true },
    });
    if (!collision) break;
    code = "";
  }

  if (!code) throw new Error("No se pudo generar un código de verificación único");

  await db.emailVerification.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: now },
  });
  const verification = await db.emailVerification.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
    },
  });

  try {
    await sendVerificationEmail(user.email, code);
  } catch (error) {
    await db.emailVerification.updateMany({
      where: { id: verification.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    throw error;
  }
}

export async function resendVerificationCode(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerified: true } });
  if (!user || user.emailVerified) return;
  await issueVerificationCode(user);
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (!user) throw new HttpError(400, "INVALID_CODE", "El código de verificación es incorrecto.");

  const verification = await db.emailVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const codeHash = hashVerificationCode(code);
  if (user.emailVerified) {
    if (verification?.codeHash === codeHash && verification.usedAt) {
      throw new HttpError(409, "CODE_USED", "Este código ya fue utilizado. Solicita uno nuevo.");
    }
    return;
  }
  if (!verification) throw new HttpError(400, "INVALID_CODE", "El código de verificación es incorrecto.");
  if (verification.usedAt) {
    throw new HttpError(409, "CODE_USED", "Este código ya fue utilizado. Solicita uno nuevo.");
  }
  if (verification.expiresAt <= new Date()) {
    await db.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } });
    throw new HttpError(410, "CODE_EXPIRED", "El código expiró. Solicita uno nuevo.");
  }
  if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new HttpError(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Solicita un código nuevo.");
  }

  if (codeHash !== verification.codeHash) {
    const previousCode = await db.emailVerification.findFirst({
      where: { userId: user.id, codeHash, usedAt: { not: null } },
      select: { id: true },
    });
    if (previousCode) {
      throw new HttpError(409, "CODE_USED", "Este código ya fue utilizado. Solicita el código más reciente.");
    }
    const attempt = await db.emailVerification.updateMany({
      where: { id: verification.id, usedAt: null, attempts: { lt: MAX_VERIFICATION_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count === 1 && verification.attempts + 1 >= MAX_VERIFICATION_ATTEMPTS) {
      throw new HttpError(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Solicita un código nuevo.");
    }
    throw new HttpError(400, "INVALID_CODE", "El código de verificación es incorrecto.");
  }

  const now = new Date();
  const completed = await db.$transaction(async (tx) => {
    const claimed = await tx.emailVerification.updateMany({
      where: {
        id: verification.id,
        codeHash,
        usedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: MAX_VERIFICATION_ATTEMPTS },
      },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;

    await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await tx.emailVerification.updateMany({
      where: { userId: user.id, id: { not: verification.id }, usedAt: null },
      data: { usedAt: now },
    });
    return true;
  });
  if (!completed) {
    throw new HttpError(409, "CODE_USED", "Este código ya fue utilizado. Solicita uno nuevo.");
  }

  const verifiedUser = await db.user.findUnique({
    where: { id: user.id },
    select: { email: true, firstName: true },
  });
  if (verifiedUser) {
    try {
      await sendWelcomeEmail(verifiedUser.email, verifiedUser.firstName);
    } catch (error) {
      console.error("[email] No se pudo enviar el correo de bienvenida", error);
    }
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return;

  try {
    await enforceEmailRateLimit("passwordReset", user.id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 429) return;
    throw error;
  }

  const token = randomBytes(32).toString("hex");
  const reset = await db.$transaction(async (tx) => {
    await tx.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return tx.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
  });

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch {
    await db.passwordReset.updateMany({
      where: { id: reset.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    // No incluir el objeto del proveedor en logs: puede contener datos de la solicitud.
    console.error("[email] No se pudo enviar el correo de recuperación");
  }
}

export async function completePasswordReset(token: string, password: string): Promise<void> {
  const tokenHash = hashResetToken(token);
  const reset = await db.passwordReset.findUnique({ where: { tokenHash } });
  if (!reset) throw new HttpError(400, "INVALID_RESET_TOKEN", "El enlace no es válido o ya fue utilizado.");
  if (reset.usedAt) throw new HttpError(409, "RESET_TOKEN_USED", "Este enlace ya fue utilizado.");
  if (reset.expiresAt <= new Date()) {
    await db.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
    throw new HttpError(410, "RESET_TOKEN_EXPIRED", "El enlace expiró. Solicita uno nuevo.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const completed = await db.$transaction(async (tx) => {
    const claimed = await tx.passwordReset.updateMany({
      where: { id: reset.id, tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.passwordReset.updateMany({
      where: { userId: reset.userId, id: { not: reset.id }, usedAt: null },
      data: { usedAt: now },
    });
    return true;
  });
  if (!completed) throw new HttpError(409, "RESET_TOKEN_USED", "Este enlace ya fue utilizado.");
}
