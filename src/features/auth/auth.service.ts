import bcrypt from "bcryptjs";

import { createSession } from "@/shared/auth/session";
import { issueVerificationCode } from "./email-flow.service";

import {
  ConflictError,
  HttpError,
  UnauthorizedError,
} from "@/shared/http/errors";

import {
  createUserWithCustomer,
  findCustomerByDocument,
  findRoleByName,
  findUserByEmail,
} from "./auth.repository";

import type { LoginInput, RegisterInput } from "./auth.schemas";

function toAuthUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: { name: string };
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role.name,
  };
}

export async function register(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new ConflictError("El correo ya está registrado");
  }

  const existingCustomer = await findCustomerByDocument(input.document);

  if (existingCustomer) {
    throw new ConflictError("El documento ya está registrado");
  }

  const role = await findRoleByName("user");

  if (!role) {
    // Error de configuración (falta seed), no del usuario.
    throw new HttpError(
      500,
      "ROLE_NOT_SEEDED",
      "El rol de usuario no existe. Ejecuta el seed de la base de datos.",
    );
  }

  const birthDate = new Date(`${input.birthDate}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    throw new ConflictError("La fecha de nacimiento no es válida");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const user = await createUserWithCustomer({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      document: input.document,
      birthDate,
      roleId: role.id,
    });

    let verificationEmailSent = true;
    try {
      await issueVerificationCode({ id: user.id, email: user.email });
    } catch (error) {
      verificationEmailSent = false;
      console.error("[email] No se pudo enviar el código de verificación", error);
    }

    return { email: user.email, verificationEmailSent };
  } catch (error) {
    // Condición de carrera en unique (email/document).
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new ConflictError("El correo o documento ya está registrado");
    }
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new UnauthorizedError("Credenciales inválidas");
  }

  if (!user.isActive) {
    throw new UnauthorizedError("Usuario inactivo");
  }

  const passwordValid = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordValid) {
    throw new UnauthorizedError("Credenciales inválidas");
  }

  if (!user.emailVerified) {
    throw new HttpError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Debes verificar tu correo electrónico antes de iniciar sesión.",
    );
  }

  await createSession(user.id, user.role.name as "user" | "admin" | "employee");

  return toAuthUser(user);
}
