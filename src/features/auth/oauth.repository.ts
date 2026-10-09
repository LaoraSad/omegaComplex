import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { db } from "@/shared/lib/db";

// ---------------------------------------------------------------------------
// Persistencia de OAuth (SCRUM seccion 8: "Cuenta de Google mediante OAuth").
//
// La tabla OAuthAccount ya existe y esta migrada. Aqui queda como se consulta y
// como se crea o vincula la cuenta. El intercambio del codigo con Google lo
// implementa el equipo en la ruta de callback: esta capa no conoce a Google.
// ---------------------------------------------------------------------------

export type OAuthProfile = {
  /** Identificador estable en el proveedor (sub de Google). */
  providerAccountId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type OAuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isNewUser: boolean;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findOAuthAccount(
  provider: string,
  providerAccountId: string,
): Promise<OAuthUser | null> {
  const account = await db.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: { include: { role: true } } },
  });
  if (!account) return null;

  const { user } = account;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role.name,
    isNewUser: false,
  };
}

/**
 * Rol de cliente. Se busca el existente y, si la base aun no lo tiene, se crea:
 * un alta por Google es un cliente del complejo, nunca un empleado.
 */
async function customerRoleId(): Promise<string> {
  const existing = await db.role.findFirst({ where: { name: "user" as const } });
  return (existing ?? (await db.role.create({ data: { name: "user" as const } }))).id;
}

/**
 * Usuario que entra por primera vez con Google: se crea User + Customer +
 * OAuthAccount en una sola transaccion.
 *
 * User.passwordHash es obligatorio en el esquema y aqui no hay contrasena real,
 * por eso se guarda el hash de una cadena aleatoria: la cuenta existe pero
 * solo se puede entrar por Google.
 *
 * El rol siempre es de cliente. Nadie se vuelve empleado por entrar con Google.
 *
 * El correo ya viene verificado por el proveedor, asi que este usuario no
 * pasa por el codigo de verificacion (que solo aplica al registro manual).
 */
export async function createUserFromOAuth(
  provider: string,
  profile: OAuthProfile,
): Promise<OAuthUser> {
  const email = normalizeEmail(profile.email);
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const roleId = await customerRoleId();

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        roleId,
        email,
        passwordHash,
        firstName: profile.firstName,
        lastName: profile.lastName,
      },
    });
    await tx.customer.create({ data: { userId: created.id } });
    await tx.oAuthAccount.create({
      data: { userId: created.id, provider, providerAccountId: profile.providerAccountId },
    });
    return created;
  });

  const role = await db.role.findUniqueOrThrow({ where: { id: user.roleId }, select: { name: true } });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: role.name,
    isNewUser: true,
  };
}

/**
 * El correo ya existe de un registro manual: se vincula la cuenta de Google a
 * esa misma cuenta en vez de crear una segunda. El unico de esta manera queda
 * con el mismo usuario, no con dos (pregunta 49 del SCRUM: una persona, una
 * cuenta).
 */
export async function linkOAuthAccount(
  userId: string,
  provider: string,
  profile: OAuthProfile,
): Promise<OAuthUser> {
  await db.oAuthAccount.create({
    data: { userId, provider, providerAccountId: profile.providerAccountId },
  });

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: true },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role.name,
    isNewUser: false,
  };
}

export async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  return db.user.findUnique({ where: { email: normalizeEmail(email) }, select: { id: true } });
}

/** Estado CSRF del intento de OAuth: se compara en el callback. */
export function newOAuthState(): string {
  return randomBytes(24).toString("base64url");
}