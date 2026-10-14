import { db } from "@/shared/lib/db";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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

export async function findCustomerByDocument(document: string) {
  return db.customer.findUnique({
    where: {
      document: document.trim(),
    },
  });
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
};

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

export async function findRoleByName(
  name: "user" | "admin" | "employee",
) {
  return db.role.findFirst({
    where: {
      name,
    },
  });
}

/** Credenciales mínimas para verificar y cambiar la contraseña. */
export async function findUserCredentialsById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, passwordHash: true, isActive: true },
  });
}

export async function updateUserPassword(id: string, passwordHash: string) {
  // P1-5: subir la versión revoca todas las sesiones anteriores.
  await db.user.update({ where: { id }, data: { passwordHash, tokenVersion: { increment: 1 } } });
}

/** Fase 2: teléfono editable del perfil. */
export async function updateUserPhone(id: string, phone: string) {
  await db.user.update({ where: { id }, data: { phone: phone.trim() } });
}

/** Fase 2: correo pendiente de re-verificación. Sube tokenVersion para
 * cerrar las sesiones vigentes (decisión: re-login tras cambiar el correo). */
export async function updateUserEmailPendingVerification(id: string, email: string) {
  await db.user.update({
    where: { id },
    data: { email: normalizeEmail(email), emailVerified: false, tokenVersion: { increment: 1 } },
  });
}

/** Correo + estado mínimo para detectar cambio/no-op en el perfil. */
export async function findUserEmailById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true },
  });
}

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
          // entrara sin comprobar el código que se envía a continuación, que es
          // justo lo que reportaba el bug de registro sin verificación.
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
