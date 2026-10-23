// -----------------------------------------------------------------------------
// src/app/(admin)/admin/empleados/actions.ts
// Server Actions para gestión de empleados (solo administrador).
// Las Server Actions se ejecutan en el servidor y pueden ser llamadas desde
// componentes del cliente mediante formularios o invocación directa.
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// requireAdmin()
// Verifica que exista una sesión y que el rol sea "admin". Si no, lanza error.
// Se usa al inicio de cada Server Action para proteger la operación.
// -----------------------------------------------------------------------------
async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  if (session.role !== "admin") throw new Error("Solo el administrador puede gestionar empleados.");
}

// -----------------------------------------------------------------------------
// readServiceIds(formData)
// Lee los IDs de servicio enviados como checkboxes repetidos en FormData.
// -----------------------------------------------------------------------------
function readServiceIds(formData: FormData): string[] {
  return formData
    .getAll("serviceIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

// -----------------------------------------------------------------------------
// revalidateEmployeeViews(id?)
// Invalida la caché de Next.js de las rutas relacionadas con empleados para
// que los cambios se reflejen inmediatamente en la UI.
// -----------------------------------------------------------------------------
function revalidateEmployeeViews(id?: string) {
  revalidatePath("/admin/empleados");
  revalidatePath("/turnos");
  revalidatePath("/validar");
  if (id) revalidatePath(`/admin/empleados/${id}`);
}

export type EmployeeActionResult = { ok: boolean; message: string };

// -----------------------------------------------------------------------------
// createEmployeeAction(formData)
// Crea un empleado con sus zonas asignadas.
//   1. requireAdmin(): verifica sesión de admin.
//   2. Valida el FormData con employeeCreateSchema (Zod).
//   3. Llama a createEmployee() del repositorio.
//   4. Revalida las rutas afectadas.
//   5. Devuelve { ok, message }.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// updateEmployeeAction(id, formData)
// Actualiza los datos del perfil de un empleado.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// setEmployeeActiveAction(id, isActive)
// Activa o desactiva un empleado. Un empleado desactivado no puede iniciar sesión
// ni validar QR.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// setEmployeeZonesAction(id, formData)
// Asigna zonas (servicios) a un empleado. Define qué instalaciones puede validar.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// setEmployeePasswordAction(id, formData)
// Actualiza la contraseña de un empleado. El admin debe comunicarla por un canal
// seguro.
// -----------------------------------------------------------------------------
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
