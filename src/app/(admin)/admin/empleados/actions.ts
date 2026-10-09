"use server";

import { revalidatePath } from "next/cache";
import {
  employeeCreateSchema,
  employeePasswordSchema,
  employeeProfileSchema,
  employeeZonesSchema,
  firstIssue,
} from "@/features/admin/admin.schemas";
import {
  createEmployee,
  setEmployeeActive,
  setEmployeePassword,
  setEmployeeZones,
  updateEmployeeProfile,
} from "@/features/admin/admin.repository";
import { getSession } from "@/shared/auth/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  if (session.role !== "admin") throw new Error("Solo el administrador puede gestionar empleados.");
}

/** Los checkboxes de zonas llegan como serviceIds repetido. */
function readServiceIds(formData: FormData): string[] {
  return formData
    .getAll("serviceIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function revalidateEmployeeViews(id?: string) {
  revalidatePath("/admin/empleados");
  if (id) revalidatePath(`/admin/empleados/${id}`);
}

export type EmployeeActionResult = { ok: boolean; message: string };

export async function createEmployeeAction(formData: FormData): Promise<EmployeeActionResult> {
  try {
    await requireAdmin();
    const parsed = employeeCreateSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      document: formData.get("document"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      serviceIds: readServiceIds(formData),
    });
    if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

    const { id } = await createEmployee(parsed.data);
    revalidateEmployeeViews(id);
    return { ok: true, message: "Empleado creado con sus zonas asignadas." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo crear el empleado.",
    };
  }
}

export async function updateEmployeeAction(
  id: string,
  formData: FormData,
): Promise<EmployeeActionResult> {
  try {
    await requireAdmin();
    const parsed = employeeProfileSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      document: formData.get("document"),
      phone: formData.get("phone"),
    });
    if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

    await updateEmployeeProfile(id, parsed.data);
    revalidateEmployeeViews(id);
    return { ok: true, message: "Datos del empleado actualizados." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo actualizar el empleado.",
    };
  }
}

export async function setEmployeeActiveAction(
  id: string,
  isActive: boolean,
): Promise<EmployeeActionResult> {
  try {
    await requireAdmin();
    await setEmployeeActive(id, isActive);
    revalidateEmployeeViews(id);
    return {
      ok: true,
      message: isActive
        ? "Empleado activado. Ya puede iniciar sesión y validar QR."
        : "Empleado desactivado. No podrá iniciar sesión ni validar QR.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo cambiar el estado del empleado.",
    };
  }
}

export async function setEmployeeZonesAction(
  id: string,
  formData: FormData,
): Promise<EmployeeActionResult> {
  try {
    await requireAdmin();
    const parsed = employeeZonesSchema.safeParse({ serviceIds: readServiceIds(formData) });
    if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

    await setEmployeeZones(id, parsed.data.serviceIds);
    revalidateEmployeeViews(id);
    return { ok: true, message: "Zonas actualizadas." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudieron guardar las zonas.",
    };
  }
}

export async function setEmployeePasswordAction(
  id: string,
  formData: FormData,
): Promise<EmployeeActionResult> {
  try {
    await requireAdmin();
    const parsed = employeePasswordSchema.safeParse({ password: formData.get("password") });
    if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

    await setEmployeePassword(id, parsed.data.password);
    revalidateEmployeeViews(id);
    return {
      ok: true,
      message: "Contraseña actualizada. Comunícasela al empleado por un canal seguro.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo actualizar la contraseña.",
    };
  }
}