// TODO(auth): implementar auth.repository.ts
import { db } from "@/shared/lib/db";

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: {
      email,
    },
    include: {
      role: true,
    },
  });
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

export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
}) {
  return db.user.create({
    data,
    include: {
      role: true,
    },
  });
}
