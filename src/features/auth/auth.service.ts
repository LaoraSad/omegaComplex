import bcrypt from "bcryptjs";

import { createSession } from "@/shared/auth/session";
import { logger } from "@/shared/lib/logger";
import { issueVerificationCode } from "./email-flow.service";
import { registrarIntento, verificarLimiteIntentos } from "./login-rate-limit";
import { enviarEvento } from "@/shared/integrations/n8n";

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
  findUserCredentialsById,
  updateUserPassword,
} from "./auth.repository";

import type { ChangePasswordInput, LoginInput, RegisterInput } from "./auth.schemas";

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
      logger.error("email.verificacion_fallida", { userId: user.id, error });
    }

    // Se le avisa a n8n con el mismo evento que usa el alta con Google, para
    // que haya un solo camino en el workflow en vez de dos ramas. Aquí el
    // código de verificación es obligatorio: la cuenta nace sin verificar.
    await enviarEvento("usuario.registrado", {
      canal: "manual",
      email: user.email,
      nombre: user.firstName,
      emailVerificado: false,
      requiereCodigo: true,
    });

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

export async function login(input: LoginInput, ip: string | null = null) {
    // El límite va ANTES de tocar la contraseña: comprobarlo después dejaría al
    // atacante sigue gastando CPU en bcrypt aunque ya esté bloqueado.
    await verificarLimiteIntentos(input.email, ip);

    const user = await findUserByEmail(input.email);

    if (!user) {
      // Cuenta inexistente: se registra igual el intento fallido, para que
      // probar correos al azar también tenga costo para quien lo intente.
      await registrarIntento(input.email, ip, false);
      throw new UnauthorizedError("Credenciales inválidas");
    }

    if (!user.isActive) {
      await registrarIntento(input.email, ip, false);
      throw new UnauthorizedError("Usuario inactivo");
    }

    const passwordValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      await registrarIntento(input.email, ip, false);
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // Puerta de verificación. El código se envía al registrarse, pero sin este
    // control nadie lo comprobaba: la cuenta entraba igual. Se revisa DESPUÉS
    // de validar la contraseña a propósito, para no regalar información sobre
    // qué correos están registrados (enumeración de cuentas).
    if (!user.emailVerified) {
      await registrarIntento(input.email, ip, false);
      throw new HttpError(
        403,
        "EMAIL_NOT_VERIFIED",
        "Verifica tu correo electrónico para poder entrar. Te enviamos un código que puedes volver a pedir.",
      );
    }

    await registrarIntento(input.email, ip, true);
    await createSession(user.id, user.role.name as "user" | "admin" | "employee");

    return toAuthUser(user);
  }

/**
 * Cambio de contraseña con sesión iniciada. Exige la contraseña actual para
 * que alguien con acceso momentáneo al dispositivo no pueda fijar una nueva.
 */
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const credentials = await findUserCredentialsById(userId);
  if (!credentials || !credentials.isActive) {
    throw new UnauthorizedError("No autenticado");
  }

  const currentValid = await bcrypt.compare(input.currentPassword, credentials.passwordHash);
  if (!currentValid) {
    throw new UnauthorizedError("La contraseña actual no es correcta");
  }

  await updateUserPassword(userId, await bcrypt.hash(input.newPassword, 12));
}
