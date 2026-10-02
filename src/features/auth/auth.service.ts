// TODO(auth): implementar auth.service.ts
import bcrypt from "bcryptjs";

import { createSession } from "@/shared/auth/session";

import {
  ConflictError,
  UnauthorizedError,
} from "@/shared/http/errors";

import {
  createUser,
  findRoleByName,
  findUserByEmail,
} from "./auth.repository";

import type { LoginInput, RegisterInput } from "./auth.schemas";

export async function register(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new ConflictError("El correo ya está registrado");
  }

  const role = await findRoleByName("user");

  if (!role) {
    throw new Error("El rol user no existe");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await createUser({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    roleId: role.id,
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role.name,
  };
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

  await createSession(user.id, user.role.name);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role.name,
  };
}
