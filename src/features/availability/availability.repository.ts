import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { liberarHoldsVencidos } from "@/features/reservations/reservations.service";
import {
  diasVentanaReserva,
  esDiaDeMantenimiento,
  esFestivo,
  nombreFestivo,
} from "@/features/schedules/colombia-holidays";
import { db } from "@/shared/lib/db";
import type { DayAvailability, SlotAvailability, SlotStatus } from "./availability.types";

// ---------------------------------------------------------------------------
// Disponibilidad real: se cruzan ServiceSchedule (horario semanal),
// ServiceClosure (cierres manuales) y ServiceSlot (cupos por franja). Nada de
// franjas fijas como antes.
//
// Encima de eso hay dos reglas que no viven en ServiceSchedule:
//   - Festivos de Colombia: el día festivo SE ABRE y desplaza el mantenimiento.
//   - Mantenimiento: lunes por defecto, martes si el lunes es festivo.

/**
 * ¿Este día está cerrado por mantenimiento?
 *
 * OJO con la dirección de la regla: el festivo NO cierra el complejo, lo que
 * hace es **desplazar el mantenimiento**. Si el lunes es festivo, ese lunes abre
 * con horario normal y el mantenimiento se corre al martes.
 */
export function cerradoPorMantenimiento(date: string): boolean {
  return esDiaDeMantenimiento(date);
}
// ---------------------------------------------------------------------------

const BOGOTA = "America/Bogota";
const SLOT_DURATION_MS = 60 * 60 * 1000;
const SLOT_WRITE_BATCH_SIZE = 500;

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
  const corto = new Intl.DateTimeFormat("en-US", { timeZone: BOGOTA, weekday: "short" })
    .format(start)
    .slice(0, 3);
  if (corto === "Sun") return 0;
  // Lun..Sab son 1..6 (indexOf daría 0..5 y pisaría al domingo).
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(corto) + 1;
}

export function toBogotaDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildSlotsForSchedule(
  baseDate: Date,
  schedule: { openTime: string; closeTime: string },
  capacity: number,
): Array<{ startsAt: Date; endsAt: Date; capacity: number }> {
  const openMinutes = timeToMinutes(schedule.openTime);
  const closeMinutes = timeToMinutes(schedule.closeTime);
  if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) return [];

  const { start: dayStart } = bogotaDayBounds(toBogotaDateKey(baseDate));
  const start = new Date(dayStart.getTime() + openMinutes * 60 * 1000);
  const close = new Date(dayStart.getTime() + closeMinutes * 60 * 1000);

  const slots: Array<{ startsAt: Date; endsAt: Date; capacity: number }> = [];
  let cursor = new Date(start);
  while (cursor.getTime() + SLOT_DURATION_MS <= close.getTime()) {
    const endsAt = new Date(cursor.getTime() + SLOT_DURATION_MS);
    slots.push({ startsAt: new Date(cursor), endsAt, capacity });
    cursor = new Date(endsAt);
  }

  return slots;
}

function timeToMinutes(value: string): number | null {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value);
  if (!match) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function scheduleBounds(
  date: string,
  schedule: { openTime: string; closeTime: string },
): { start: Date; end: Date } | null {
  const openMinutes = timeToMinutes(schedule.openTime);
  const closeMinutes = timeToMinutes(schedule.closeTime);
  if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) return null;

  const { start } = bogotaDayBounds(date);
  return {
    start: new Date(start.getTime() + openMinutes * 60 * 1000),
    end: new Date(start.getTime() + closeMinutes * 60 * 1000),
  };
}

function addBogotaDays(dateKey: string, offset: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return toBogotaDateKey(new Date(Date.UTC(year, month - 1, day + offset, 12)));
}

function dateOnlyValue(date: Date): number {
  return Date.parse(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export async function generateServiceSlotsForRange(
  serviceId: string,
  rangeDays?: number,
  client: PrismaClient = db,
): Promise<number> {
  const firstDate = toBogotaDateKey(new Date());
  // P2-3: por defecto se cubre toda la ventana reservable (hoy + 3 meses),
  // no 90 días fijos. Con 90 fijos quedaba un hueco donde el backend permitía
  // reservar pero no había franjas generadas.
  const dias = rangeDays ?? diasVentanaReserva(firstDate);
  if (!Number.isInteger(dias) || dias < 1) {
    throw new Error("rangeDays debe ser un entero mayor que cero.");
  }

  const service = await client.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      capacity: true,
      serviceSchedules: { select: { dayOfWeek: true, openTime: true, closeTime: true } },
    },
  });

  if (!service) return 0;

  const lastDate = addBogotaDays(firstDate, dias - 1);
  const firstDateValue = Date.parse(`${firstDate}T00:00:00.000Z`);
  const lastDateValue = Date.parse(`${lastDate}T00:00:00.000Z`);
  const closures = await client.serviceClosure.findMany({
    where: {
      OR: [{ serviceId }, { serviceId: null }],
      dateFrom: { lte: new Date(lastDateValue) },
      dateTo: { gte: new Date(firstDateValue) },
    },
    select: { dateFrom: true, dateTo: true },
  });
  const slots: Array<{ startsAt: Date; endsAt: Date; capacity: number }> = [];

  for (let offset = 0; offset < dias; offset++) {
    const dateKey = addBogotaDays(firstDate, offset);

// Festivo y mantenimiento no generan franjas. Ojo: el festivo por sí solo NO
  // cierra el complejo; lo que se cierra es el día de mantenimiento, que es el
  // que se corre cuando el lunes es festivo.
  if (cerradoPorMantenimiento(dateKey)) continue;

    const dateValue = Date.parse(`${dateKey}T00:00:00.000Z`);
    if (closures.some((closure) =>
      dateValue >= dateOnlyValue(closure.dateFrom) && dateValue <= dateOnlyValue(closure.dateTo),
    )) continue;

    const dayOfWeek = bogotaDayOfWeek(dateKey);
    const schedule = service.serviceSchedules.find((item) => item.dayOfWeek === dayOfWeek);
    if (!schedule) continue;

    slots.push(...buildSlotsForSchedule(bogotaDayBounds(dateKey).start, schedule, service.capacity));
  }

  let upserted = 0;
  for (let offset = 0; offset < slots.length; offset += SLOT_WRITE_BATCH_SIZE) {
    const batch = slots.slice(offset, offset + SLOT_WRITE_BATCH_SIZE);
    const values = Prisma.join(batch.map((slot) => Prisma.sql`(
      ${randomUUID()}::uuid,
      ${serviceId}::uuid,
      ${slot.startsAt},
      ${slot.endsAt},
      ${slot.capacity},
      0,
      0
    )`));

    upserted += await client.$executeRaw(Prisma.sql`
      INSERT INTO "ServiceSlot" ("id", "serviceId", "startsAt", "endsAt", "capacity", "bookedCount", "heldCount")
      VALUES ${values}
      ON CONFLICT ("serviceId", "startsAt") DO UPDATE
      SET "endsAt" = EXCLUDED."endsAt", "capacity" = EXCLUDED."capacity"
    `);
  }

  return upserted;
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
        isActive: true,
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

  const cerrado = (motivo: DayAvailability["motivo"], reason: string): DayAvailability => ({
    ...base,
    open: false,
    hayDisponibilidad: false,
    motivo,
    reason,
    festivo: festivo ? nombreFestivo(date) : null,
    slots: [],
  });

  // Desactivada por el admin: cierra la venta nueva sin tocar reservas vivas.
  if (!service.isActive) {
    return cerrado("servicio_inactivo", "Esta instalación no está disponible actualmente.");
  }

  // Cierre puntual del admin (imprevisto). Gana sobre todo lo demás: si alguien
  // cerró la instalación a mano, ese es el motivo que hay que explicar.
  if (closure) {
    return cerrado("cierre_admin", closure.reason ?? "Bloqueada por el administrador");
  }

  // Festivo nacional: el complejo ABRE. Lo que hace el festivo es correr el
  // mantenimiento de esa semana al martes, no cerrar el día. Antes se cerraba y
  // quedaba la incoherencia de un lunes festivo que ni abría ni figuraba con
  // franjas generadas.
  const festivo = esFestivo(date);

  // Mantenimiento: lunes, o martes cuando el lunes fue festivo.
  if (cerradoPorMantenimiento(date)) {
    return cerrado("mantenimiento", "Jornada de mantenimiento técnico");
  }

  const dayOfWeek = bogotaDayOfWeek(date);
  const schedule = service.serviceSchedules.find((s) => s.dayOfWeek === dayOfWeek);
  if (!schedule) {
    return cerrado("sin_horario", "Cerrado este día");
  }
  const bounds = scheduleBounds(date, schedule);
  if (!bounds) {
    return cerrado("horario_invalido", "Horario no válido");
  }

  const slots = await db.serviceSlot.findMany({
    where: {
      serviceId,
      startsAt: { gte: bounds.start, lt: bounds.end },
      endsAt: { lte: bounds.end },
    },
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
    return {
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      free,
      status: estadoDeSlot(s.startsAt, free, now),
    };
  });

  const hayDisponibilidad = disponibles.some((s) => s.status === "available");

  // El día está abierto aunque ya no queden franjas: son dos cosas distintas y
  // confundirlas hacía que el modal dijera "no hay franjas para ese día" a las
  // 6 de la tarde en un martes que sí atendía.
  if (slots.length === 0) {
    return { ...base, open: true, hayDisponibilidad: false, motivo: "sin_franjas", reason: "No hay franjas generadas para este día", festivo: festivo ? nombreFestivo(date) : null, openTime: schedule.openTime, closeTime: schedule.closeTime, slots: [] };
  }

  return {
    ...base,
    open: true,
    hayDisponibilidad,
    festivo: festivo ? nombreFestivo(date) : null,
    motivo: hayDisponibilidad ? null : "franjas_terminadas",
    reason: hayDisponibilidad
      ? null
      : disponibles.every((s) => s.status === "past")
        ? "Las franjas de hoy ya empezaron o terminaron"
        : "Todas las franjas de este día están completas",
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

  const [service, closures, slots] = await Promise.all([
    db.service.findUnique({
      where: { id: serviceId },
      select: { isActive: true, serviceSchedules: { select: { dayOfWeek: true, openTime: true, closeTime: true } } },
    }),
    db.serviceClosure.findMany({
      where: {
        OR: [{ serviceId }, { serviceId: null }],
        dateFrom: { lte: toDateOnly(new Date(end.getTime() - 1)) },
        dateTo: { gte: toDateOnly(start) },
      },
      select: { dateFrom: true, dateTo: true },
    }),
    db.serviceSlot.findMany({
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
    }),
  ]);
  if (!service || !service.isActive) return [];

  const validSlots = slots.filter((slot) => {
    const dateKey = toBogotaDateKey(slot.startsAt);
    const dateValue = Date.parse(`${dateKey}T00:00:00.000Z`);
    if (closures.some((closure) =>
      dateValue >= dateOnlyValue(closure.dateFrom) && dateValue <= dateOnlyValue(closure.dateTo),
    )) return false;

    // El día de mantenimiento anula el horario semanal. Los festivos no: el
    // festivo abre el complejo y solo mueve el mantenimiento.
    if (cerradoPorMantenimiento(dateKey)) return false;

    const dayOfWeek = bogotaDayOfWeek(dateKey);
    const schedule = service.serviceSchedules.find((item) => item.dayOfWeek === dayOfWeek);
    const bounds = schedule ? scheduleBounds(dateKey, schedule) : null;
    return Boolean(bounds && slot.startsAt >= bounds.start && slot.endsAt <= bounds.end);
  });

  return validSlots.map((s) => {
    const free = Math.max(s.capacity - s.bookedCount - s.heldCount, 0);
    return {
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      free,
      status: estadoDeSlot(s.startsAt, free, now),
    };
  });
}

/**
 * Estado de una franja frente al reloj.
 *
 * P2-1: pasado = ya empezó (`startsAt <= now`), no ya terminó. La escritura
 * exige `startsAt > now` (§12 franjas ya iniciadas), así que una franja
 * iniciada se mostraba disponible y luego fallaba al reservar.
 */
export function estadoDeSlot(startsAt: Date, free: number, now: Date): SlotStatus {
  if (startsAt <= now) return "past";
  if (free === 0) return "full";
  return "available";
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