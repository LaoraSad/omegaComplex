import { liberarHoldsVencidos } from "@/features/reservations/reservations.service";
import { db } from "@/shared/lib/db";
import type { DayAvailability, SlotAvailability } from "./availability.types";

// ---------------------------------------------------------------------------
// Disponibilidad real: se cruzan ServiceSchedule (horario semanal),
// ServiceClosure (bloqueos) y ServiceSlot (cupos por franja). Nada de franjas
// fijas como antes.
// ---------------------------------------------------------------------------

const BOGOTA = "America/Bogota";

/** Rango [start, end) del dia pedido en America/Bogota. */
export function bogotaDayBounds(date: string): { start: Date; end: Date } {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Fecha inválida, se espera AAAA-MM-DD.");
  return {
    start: new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d + 1, 5, 0, 0, 0)),
  };
}

/** Dia de la semana 0=domingo .. 6=sabado, igual que ServiceSchedule. */
export function bogotaDayOfWeek(date: string): number {
  const { start } = bogotaDayBounds(date);
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: BOGOTA, weekday: "short" })
      .format(start)
      .slice(0, 3) === "Sun"
      ? 0
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
          new Intl.DateTimeFormat("en-US", { timeZone: BOGOTA, weekday: "short" })
            .format(start)
            .slice(0, 3),
        ),
  );
}

/**
 * Disponibilidad de una instalacion en una fecha.
 * Cierra el dia si el complejo no atiende (regla de mantenimiento), si hay un
 * bloqueo vigente, o si la franja ya paso.
 */
export async function getDayAvailability(
  serviceId: string,
  date: string,
): Promise<DayAvailability> {
  const { start, end } = bogotaDayBounds(date);
  const now = new Date();

  // Antes de contar nada: si alguien abandonó el checkout, sus cupos ya no están
  // retenidos. Sin esto el cliente ve "completo" por bloqueos ya vencidos.
  await liberarHoldsVencidos(now);

  const [service, closure] = await Promise.all([
    db.service.findFirst({
      where: { id: serviceId, category: { is: { isActive: true } } },
      select: {
        id: true,
        name: true,
        capacity: true,
        serviceSchedules: { select: { dayOfWeek: true, openTime: true, closeTime: true } },
      },
    }),
    db.serviceClosure.findFirst({
      where: {
        OR: [{ serviceId }, { serviceId: null }],
        dateFrom: { lte: toDateOnly(start) },
        dateTo: { gte: toDateOnly(start) },
      },
      select: { reason: true, dateFrom: true, dateTo: true },
    }),
  ]);

  if (!service) throw new Error("La instalación no existe.");

  const base = {
    serviceId: service.id,
    serviceName: service.name,
    date,
    capacity: service.capacity,
    closureReason: closure?.reason ?? null,
  };

  if (closure) {
    return { ...base, open: false, reason: "Bloqueada", slots: [] };
  }

  const dayOfWeek = bogotaDayOfWeek(date);
  const schedule = service.serviceSchedules.find((s) => s.dayOfWeek === dayOfWeek);
  if (!schedule) {
    // El SCRUM fija el lunes como dia de mantenimiento; el horario semanal de la
    // instalacion es la fuente de verdad para el resto.
    return { ...base, open: false, reason: "Cerrado este día", slots: [] };
  }

  const slots = await db.serviceSlot.findMany({
    where: { serviceId, startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      bookedCount: true,
      heldCount: true,
    },
  });

  const disponibles: SlotAvailability[] = slots.map((s) => {
    const occupied = s.bookedCount + s.heldCount;
    const free = Math.max(s.capacity - occupied, 0);
    const pasado = s.endsAt <= now;
    return {
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      free,
      status: pasado ? "past" : free === 0 ? "full" : "available",
    };
  });

  return {
    ...base,
    open: disponibles.some((s) => s.status === "available"),
    reason: null,
    openTime: schedule.openTime,
    closeTime: schedule.closeTime,
    slots: disponibles,
  };
}

/** Franjas generadas para una instalacion en un rango de fechas. */
export async function getSlotsInRange(
  serviceId: string,
  from: string,
  to: string,
): Promise<SlotAvailability[]> {
  const start = bogotaDayBounds(from).start;
  const end = bogotaDayBounds(to).end;
  const now = new Date();

  // Igual que en el detalle del dia: primero se liberan los holds vencidos.
  await liberarHoldsVencidos(now);

  const slots = await db.serviceSlot.findMany({
    where: { serviceId, startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      bookedCount: true,
      heldCount: true,
    },
  });

  return slots.map((s) => {
    const free = Math.max(s.capacity - s.bookedCount - s.heldCount, 0);
    return {
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      free,
      status: s.endsAt <= now ? "past" : free === 0 ? "full" : "available",
    };
  });
}

/** Date-only para comparar con las columnas @db.Date de ServiceClosure. */
function toDateOnly(d: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 5, 0, 0, 0));
}