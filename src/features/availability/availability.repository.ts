import { db } from "@/shared/lib/db";

import type { DayRangeUtc, ServiceSlotRow } from "./availability.types";

export async function serviceExists(serviceId: string): Promise<boolean> {
  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  });

  return service !== null;
}

/**
 * Franjas (`ServiceSlot`) de un servicio dentro de un día local de Bogotá.
 * El rango es semiabierto y ya viene en UTC, así que la consulta no depende de
 * la zona horaria del servidor. El orden por `startsAt` usa el índice
 * `(serviceId, startsAt)` del modelo.
 */
export async function findSlotsForDay(
  serviceId: string,
  range: DayRangeUtc,
): Promise<ServiceSlotRow[]> {
  return db.serviceSlot.findMany({
    where: {
      serviceId,
      startsAt: {
        gte: range.startUtc,
        lt: range.endUtc,
      },
    },
    orderBy: {
      startsAt: "asc",
    },
    select: {
      id: true,
      serviceId: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      bookedCount: true,
      heldCount: true,
    },
  });
}