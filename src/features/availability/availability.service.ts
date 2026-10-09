import { NotFoundError } from "@/shared/http/errors";

import { getBogotaDayRange } from "./availability.datetime";
import { findSlotsForDay, serviceExists } from "./availability.repository";
import type { AvailabilityQuery } from "./availability.schemas";
import type {
  AvailabilityByDay,
  ServiceSlotRow,
  SlotAvailability,
} from "./availability.types";

function toSlotAvailability(slot: ServiceSlotRow): SlotAvailability {
  return {
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    heldCount: slot.heldCount,
    // Cupos libres = capacidad - confirmados - bloqueados por un hold en curso.
    // `bookedCount` son reservas ya pagadas y `heldCount` son franjas con un pago
    // pendiente: en ambos casos el cupo ya no se puede vender.
    // El `Math.max` solo protege al frontend de filas con contadores incoherentes
    // (por ejemplo datos cargados antes de existir la protección de sobreventa);
    // la reserva en sí siempre valida contra la capacidad real.
    available: Math.max(0, slot.capacity - slot.bookedCount - slot.heldCount),
  };
}

export async function getAvailability(
  query: AvailabilityQuery,
): Promise<AvailabilityByDay> {
  // Se distingue "servicio inexistente" (404) de "servicio sin franjas ese día"
  // (200 con `slots: []`), para que el frontend no ofrezca un servicio borrado.
  const exists = await serviceExists(query.serviceId);

  if (!exists) {
    throw new NotFoundError("El servicio no existe");
  }

  const slots = await findSlotsForDay(query.serviceId, getBogotaDayRange(query.date));

  return {
    serviceId: query.serviceId,
    date: query.date,
    slots: slots.map(toSlotAvailability),
  };
}