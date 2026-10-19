// -----------------------------------------------------------------------------
// src/features/auth/auth.service.ts
// Lógica de negocio de autenticación: registro, login, cambio de contraseña,
// actualización de perfil y verificación de correo.
// Orquesta repositorios, bcrypt, JWT (sesión), rate limiting, envío de correos
// (vía n8n) y eventos.
// -----------------------------------------------------------------------------

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
  findUserEmailById,
  normalizeEmail,
  updateUserEmailPendingVerification,
  updateUserPassword,
  updateUserPhone,
} from "./auth.repository";

import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateProfileInput } from "./auth.schemas";

// -----------------------------------------------------------------------------
// toAuthUser(user)
// Mapea un objeto de usuario de la BD (con relación role) al formato AuthUser
// que se devuelve al cliente tras login o register.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// register(input)
// Registra un nuevo usuario (cliente). Flujo:
//   1. Verifica que no exista ya un usuario con ese email (findUserByEmail).
//   2. Verifica que no exista un Customer con ese documento (findCustomerByDocument).
//   3. Busca el rol "user" en BD. Si no existe, lanza 500 (falta ejecutar el seed).
//   4. Valida la fecha de nacimiento.
//   5. Hashea la contraseña con bcrypt (12 rondas).
//   6. Crea el User y el Customer dentro de una transacción de Prisma
//      (createUserWithCustomer). El usuario nace con emailVerified = false.
//   7. Intenta enviar código de verificación por correo (issueVerificationCode).
//      Si falla, no detiene el registro; solo se registra en logs.
//   8. Envía evento "usuario.registrado" a n8n para que gestione el correo.
//   9. Devuelve los datos del usuario (sin el token; el token se genera en el route handler).
//   - Si hay condición de carrera en unique (error P2002 de Prisma), lanza ConflictError.
// -----------------------------------------------------------------------------
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

    // Se avisa a n8n con el mismo evento que usa el alta con Google, para que
    // haya un solo camino en el workflow. La cuenta nace SIN verificar.
    await enviarEvento("usuario.registrado", {
      canal: "manual",
      email: user.email,
      nombre: user.firstName,
      emailVerificado: false,
      requiereCodigo: true,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role.name,
      emailVerified: user.emailVerified,
      verificationEmailSent,
    };
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

// -----------------------------------------------------------------------------
// login(input, ip)
// Autentica un usuario. Flujo:
//   1. Rate limiting ANTES de tocar la contraseña (verificarLimiteIntentos).
//      Esto evita que un atacante gaste CPU en bcrypt si ya está bloqueado.
//   2. Busca el usuario por email (findUserByEmail).
//   3. Si no existe, registra intento fallido y lanza 401.
//   4. Si el usuario está inactivo, registra intento fallido y lanza 401.
//   5. Compara la contraseña con bcrypt.compare.
//   6. Si la contraseña es inválida, registra intento fallido y lanza 401.
//   7. Puerta de verificación: si emailVerified es false, lanza 403 EMAIL_NOT_VERIFIED.
//      Se revisa DESPUÉS de validar la contraseña para no revelar qué correos
//      están registrados (evita enumeración de cuentas).
//   8. Registra intento exitoso.
//   9. Crea la sesión JWT (createSession) que guarda la cookie HttpOnly.
//   10. Devuelve los datos del usuario.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// changePassword(userId, input)
// Cambia la contraseña de un usuario autenticado. Requiere la contraseña actual.
//   1. Obtiene credenciales del usuario (findUserCredentialsById).
//   2. Compara la contraseña actual con bcrypt.compare.
//   3. Hashea la nueva contraseña y la guarda (updateUserPassword).
//      - updateUserPassword incrementa tokenVersion, lo que revoca todas las
//        sesiones activas previas (P1-5).
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// UpdateProfileResult (tipo)
// Resultado de la actualización de perfil.
// -----------------------------------------------------------------------------
export type UpdateProfileResult = {
  phoneUpdated: boolean;
  emailChanged: boolean;
  newEmail?: string;
  verificationEmailSent?: boolean;
};

// -----------------------------------------------------------------------------
// updateProfile(userId, input)
// Edita teléfono y correo del perfil.
//   - Teléfono: actualización directa (updateUserPhone).
//   - Correo:
//       a. Normaliza el email.
//       b. Si es diferente al actual, verifica que no lo use otro usuario.
//       c. Actualiza el email, pone emailVerified = false e incrementa
//          tokenVersion (revoca sesiones, igual que cambio de clave).
//       d. Envía código de verificación al nuevo correo.
//   - document y birthDate NO se pueden editar aquí (rechazado por Zod strict en la ruta).
// -----------------------------------------------------------------------------
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const current = await findUserEmailById(userId);
  if (!current || !current.isActive) {
    throw new UnauthorizedError("No autenticado");
  }

  let phoneUpdated = false;
  let emailChanged = false;
  let newEmail: string | undefined;
  let verificationEmailSent: boolean | undefined;

  if (input.phone !== undefined) {
    await updateUserPhone(userId, input.phone);
    phoneUpdated = true;
  }

  if (input.email !== undefined) {
    const normalized = normalizeEmail(input.email);
    if (normalized !== normalizeEmail(current.email)) {
      const existing = await findUserByEmail(normalized);
      if (existing && existing.id !== userId) {
        throw new ConflictError("El correo ya está registrado");
      }
      try {
        await updateUserEmailPendingVerification(userId, normalized);
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
          throw new ConflictError("El correo ya está registrado");
        }
        throw error;
      }
      emailChanged = true;
      newEmail = normalized;
      verificationEmailSent = true;
      try {
        await issueVerificationCode({ id: userId, email: normalized });
      } catch (error) {
        verificationEmailSent = false;
        logger.error("email.verificacion_cambio_fallida", { userId, error });
      }
    }
  }

  return { phoneUpdated, emailChanged, newEmail, verificationEmailSent };
}
