// -----------------------------------------------------------------------------
// src/features/auth/auth.repository.ts
// Acceso a datos (Prisma) del dominio de autenticación.
// Todas las funciones aquí solo leen/escriben en la base de datos; no contienen
// reglas de negocio (esas viven en auth.service.ts).
// -----------------------------------------------------------------------------

import { db } from "@/shared/lib/db";

// -----------------------------------------------------------------------------
// normalizeEmail(email)
// Normaliza un correo eliminando espacios y pasando a minúsculas.
// Se usa para búsquedas y comparaciones consistentes (evita duplicados por mayúsculas).
// -----------------------------------------------------------------------------
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// -----------------------------------------------------------------------------
// findUserByEmail(email)
// Busca un usuario por email (normalizado), incluyendo su rol.
// -----------------------------------------------------------------------------
export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
    include: {
      role: true,
    },
  });
}

// -----------------------------------------------------------------------------
// findCustomerByDocument(document)
// Busca un Customer por documento de identidad (trimado).
// -----------------------------------------------------------------------------
export async function findCustomerByDocument(document: string) {
  return db.customer.findUnique({
    where: {
      document: document.trim(),
    },
  });
}

// -----------------------------------------------------------------------------
// SessionUser (tipo)
// Datos del usuario de sesión: id, email, nombres, teléfono, rol, emailVerified.
// -----------------------------------------------------------------------------
export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
};

// -----------------------------------------------------------------------------
// findSessionUserById(id)
// Busca un usuario por id para cargar los datos de sesión.
// Devuelve null si no existe o si está inactivo.
// -----------------------------------------------------------------------------
export async function findSessionUserById(id: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { id },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role.name,
    emailVerified: user.emailVerified,
  };
}

// -----------------------------------------------------------------------------
// findRoleByName(name)
// Busca un rol por nombre ("user", "admin", "employee").
// Se usa en registro para asignar el rol por defecto.
// -----------------------------------------------------------------------------
export async function findRoleByName(
  name: "user" | "admin" | "employee",
) {
  return db.role.findFirst({
    where: {
      name,
    },
  });
}

// -----------------------------------------------------------------------------
// findUserCredentialsById(id)
// Obtiene solo id, passwordHash e isActive de un usuario.
// Se usa para verificar contraseña en login y cambio de contraseña.
// -----------------------------------------------------------------------------
export async function findUserCredentialsById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, passwordHash: true, isActive: true },
  });
}

// -----------------------------------------------------------------------------
// updateUserPassword(id, passwordHash)
// Actualiza la contraseña e incrementa tokenVersion.
// Incrementar tokenVersion revoca todos los JWT existentes (P1-5),
// forzando re-login tras cambio de clave.
// -----------------------------------------------------------------------------
export async function updateUserPassword(id: string, passwordHash: string) {
  // P1-5: subir la versión revoca todas las sesiones anteriores.
  await db.user.update({ where: { id }, data: { passwordHash, tokenVersion: { increment: 1 } } });
}

// -----------------------------------------------------------------------------
// updateUserPhone(id, phone)
// Actualiza el teléfono del usuario.
// -----------------------------------------------------------------------------
export async function updateUserPhone(id: string, phone: string) {
  await db.user.update({ where: { id }, data: { phone: phone.trim() } });
}

// -----------------------------------------------------------------------------
// updateUserEmailPendingVerification(id, email)
// Cambia el correo, pone emailVerified = false e incrementa tokenVersion.
// Esto fuerza re-login y re-verificación del nuevo correo.
// -----------------------------------------------------------------------------
export async function updateUserEmailPendingVerification(id: string, email: string) {
  await db.user.update({
    where: { id },
    data: { email: normalizeEmail(email), emailVerified: false, tokenVersion: { increment: 1 } },
  });
}

// -----------------------------------------------------------------------------
// findUserEmailById(id)
// Obtiene id, email e isActive de un usuario.
// Se usa en updateProfile para detectar si el correo cambió.
// -----------------------------------------------------------------------------
export async function findUserEmailById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true },
  });
}

// -----------------------------------------------------------------------------
// createUserWithCustomer(data)
// Crea un User y su Customer asociado dentro de una transacción de Prisma.
//   - User: email normalizado, contraseña hasheada, nombre, teléfono, rol.
//     emailVerified = false (la cuenta nace sin verificar).
//   - Customer: vinculado al userId, con documento y fecha de nacimiento.
//   - Todo es atómico: si falla cualquiera, se revierte todo.
// -----------------------------------------------------------------------------
export async function createUserWithCustomer(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  document: string;
  birthDate: Date;
  roleId: string;
}) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        roleId: data.roleId,
        // Nace SIN verificar. Marcarlo aquí como true hacía que la cuenta
        // entrara sin comprobar el código que se envía a continuación.
        emailVerified: false,
      },
      include: {
        role: true,
      },
    });

    await tx.customer.create({
      data: {
        userId: user.id,
        document: data.document.trim(),
        birthDate: data.birthDate,
      },
    });

    return user;
  });
}

// -----------------------------------------------------------------------------
// createUser(data)
// Crea un User directamente (usado por OAuth/Google, donde el email ya está verificado).
// -----------------------------------------------------------------------------
export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
}) {
  return db.user.create({
    data: {
      ...data,
      email: normalizeEmail(data.email),
      emailVerified: true,
    },
    include: {
      role: true,
    },
  });
}
