// -----------------------------------------------------------------------------
// src/app/(admin)/admin/horarios/actions.ts
// Server Actions para gestión de horarios y cierres de instalaciones
// (solo administrador).
// -----------------------------------------------------------------------------

"use server";

import { revalidatePath } from "next/cache";
import {
  createClosure,
  deleteClosure,
  deleteServiceSchedule,
  upsertServiceSchedule,
} from "@/features/admin/admin.repository";
import { getSession } from "@/shared/auth/session";

// -----------------------------------------------------------------------------
// requireAdmin()
// Verifica que exista una sesión y que el rol sea "admin".
// -----------------------------------------------------------------------------
async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  if (session.role !== "admin") throw new Error("Solo el administrador puede gestionar bloqueos.");
}

// -----------------------------------------------------------------------------
// blockFacilityAction(formData)
// Registra un cierre/bloqueo de una instalación (ServiceClosure) en un rango de
// fechas. Si serviceId es vacío, se guarda como null (cierra todo el complejo).
// -----------------------------------------------------------------------------
export async function blockFacilityAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
    const serviceId = String(formData.get("serviceId") ?? "");
    const dateFrom = String(formData.get("dateFrom") ?? "");
    const dateTo = String(formData.get("dateTo") ?? "");
    const reason = String(formData.get("reason") ?? "");
    if (!dateFrom || !dateTo) {
      return { ok: false, message: "Selecciona la fecha de inicio y de fin del bloqueo." };
    }
    await createClosure({
      serviceId: serviceId || null,
      dateFrom,
      dateTo,
      reason,
    });
    revalidatePath("/admin/horarios");
    return { ok: true, message: "Bloqueo registrado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo registrar el bloqueo.",
    };
  }
}

// -----------------------------------------------------------------------------
// unblockFacilityAction(id)
// Elimina un cierre de instalación por su ID.
// -----------------------------------------------------------------------------
export async function unblockFacilityAction(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
    await deleteClosure(id);
    revalidatePath("/admin/horarios");
    return { ok: true, message: "Bloqueo eliminado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo eliminar el bloqueo.",
    };
  }
}

// -----------------------------------------------------------------------------
// saveServiceScheduleAction(formData)
// Guarda o actualiza el horario semanal de una instalación (ServiceSchedule):
// día de la semana, hora de apertura y hora de cierre.
// -----------------------------------------------------------------------------
export async function saveServiceScheduleAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
    const serviceId = String(formData.get("serviceId") ?? "").trim();
    const dayOfWeek = Number(formData.get("dayOfWeek") ?? -1);
    const openTime = String(formData.get("openTime") ?? "").trim();
    const closeTime = String(formData.get("closeTime") ?? "").trim();

    if (!serviceId || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return { ok: false, message: "Selecciona una instalación y un día válido." };
    }
    if (!openTime || !closeTime) {
      return { ok: false, message: "Debes indicar la hora de apertura y cierre." };
    }

    await upsertServiceSchedule({ serviceId, dayOfWeek, openTime, closeTime });
    revalidatePath("/admin/horarios");
    return { ok: true, message: "Horario actualizado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el horario.",
    };
  }
}

// -----------------------------------------------------------------------------
// deleteServiceScheduleAction(serviceId, dayOfWeek)
// Elimina un horario semanal de una instalación para un día concreto.
// -----------------------------------------------------------------------------
export async function deleteServiceScheduleAction(serviceId: string, dayOfWeek: number): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
    await deleteServiceSchedule(serviceId, dayOfWeek);
    revalidatePath("/admin/horarios");
    return { ok: true, message: "Horario eliminado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo eliminar el horario.",
    };
  }
}
