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
  await db.user.update({ where: { id }, data: { passwordHash } });
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
    },
    include: {
      role: true,
    },
  });
}
