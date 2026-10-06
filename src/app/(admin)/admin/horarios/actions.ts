"use server";

import { revalidatePath } from "next/cache";
import { createClosure, deleteClosure } from "@/features/admin/admin.repository";
import { getSession } from "@/shared/auth/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  if (session.role !== "admin") throw new Error("Solo el administrador puede gestionar bloqueos.");
}

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
