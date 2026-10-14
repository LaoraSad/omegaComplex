// Repositorio de admin: métricas, reportes, reservas, accesos, servicios, empleados y clientes.
import bcrypt from "bcryptjs";
import { db } from "@/shared/lib/db";
import type { Prisma } from "@prisma/client";
import { diaDeSemana, ultimoDiaReservable } from "@/features/schedules/colombia-holidays";
import { slugifyCategory } from "@/features/catalog/catalog.schemas";
import { ConflictError, NotFoundError } from "@/shared/http/errors";

import type {
  AccessRow,
  ClosureRow,
  CustomerRow,
  DashboardOverview,
  EmployeeAccessRow,
  EmployeeDetailRow,
  EmployeeRow,
  MetricasRango,
  OcupacionFecha,
  Paginated,
  ReservationDetail,
  ReservationRow,
  ServiceRow,
  UsoReservas,
  ZoneGroup,
} from "./admin.types";
import { RESERVATION_STATUSES } from "./admin.types";

// ---------------------------------------------------------------------------
// Lecturas de administración. Solo SELECT (salvo cierres, que usan el modelo
// ServiceClosure existente). No se altera ninguna regla de negocio.
// ---------------------------------------------------------------------------

/** Página saneada: cualquier valor no numérico cae a la primera página. */
function sanitizePage(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(Math.trunc(value as number), 1) : 1;
}

/** Rango [start, end) del día en America/Bogota (COT = UTC-5 fijo). */
export function bogotaDayRange(ref: Date = new Date()): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ref);
  const [y, m, d] = parts.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d + 1, 5, 0, 0, 0)),
  };
}

/** Clave Bogotá YYYY-MM-DD de una fecha. */
function claveDiaBogota(ref: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ref);
}

/**
 * Sanea el filtro desde/hasta de métricas. Puro y testeable (`ahora`
 * inyectable). Sin fechas → últimos 30 días; invertidas se ordenan; el tramo
 * se acota a 90 días para no presionar el pooler.
 */
export function sanearRangoMetricas(
  desde: string | undefined,
  hasta: string | undefined,
  ahora: Date = new Date(),
): { start: Date; end: Date; desdeKey: string; hastaKey: string } {
  const valida = (v: string | undefined): string | null =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  const hoyKey = claveDiaBogota(ahora);
  const hace29 = new Date(ahora.getTime() - 29 * 24 * 60 * 60 * 1000);
  let desdeKey = valida(desde) ?? claveDiaBogota(hace29);
  let hastaKey = valida(hasta) ?? hoyKey;
  if (desdeKey > hastaKey) [desdeKey, hastaKey] = [hastaKey, desdeKey];
  // Acota a 90 días: si el tramo es mayor, se recorta por el inicio.
  const maxDias = 90;
  const inicioMs = Date.parse(`${desdeKey}T12:00:00Z`);
  const finMs = Date.parse(`${hastaKey}T12:00:00Z`);
  if (finMs - inicioMs > (maxDias - 1) * 24 * 60 * 60 * 1000) {
    desdeKey = claveDiaBogota(new Date(finMs - (maxDias - 1) * 24 * 60 * 60 * 1000));
  }
  const [y1, m1, d1] = desdeKey.split("-").map(Number);
  const [y2, m2, d2] = hastaKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y1, m1 - 1, d1, 5, 0, 0, 0)),
    end: new Date(Date.UTC(y2, m2 - 1, d2 + 1, 5, 0, 0, 0)),
    desdeKey,
    hastaKey,
  };
}

const reservationInclude = {
  customer: {
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  },
  service: { include: { category: { select: { name: true } } } },
  payments: { orderBy: { createdAt: "desc" as const } },
  holds: { where: { status: "active" as const } },
  _count: { select: { qrTokens: true } },
} as const;

const reservationListInclude = {
  customer: {
    include: { user: { select: { firstName: true, lastName: true } } },
  },
  service: { include: { category: { select: { name: true } } } },
  payments: { orderBy: { createdAt: "desc" as const }, take: 1 },
  _count: { select: { qrTokens: true } },
} as const;

/** Agregación pura del groupBy de reservas: conteo por estado y total. */
export function agregarReservasPorEstado(
  groups: Array<{ status: string; _count: { status: number } }>,
): { reservationsByStatus: Record<string, number>; totalReservations: number } {
  const reservationsByStatus: Record<string, number> = {};
  let totalReservations = 0;
  for (const g of groups) {
    reservationsByStatus[g.status] = g._count.status;
    totalReservations += g._count.status;
  }
  return { reservationsByStatus, totalReservations };
}

export type SlotOcupacion = {
  capacity: number;
  bookedCount: number;
  heldCount: number;
  service: { id: string; name: string };
};

/** Agregación pura de franjas: ocupación global y por servicio (ord. desc). */
export function agregarOcupacion(slots: SlotOcupacion[]): {
  occupancyToday: { used: number; total: number } | null;
  occupancyByService: Array<{ serviceId: string; serviceName: string; used: number; total: number }>;
} {
  const byService = new Map<string, { serviceName: string; used: number; total: number }>();
  if (slots.length === 0) return { occupancyToday: null, occupancyByService: [] };
  let used = 0;
  let total = 0;
  for (const s of slots) {
    const slotUsed = s.bookedCount + s.heldCount;
    used += slotUsed;
    total += s.capacity;
    const entry = byService.get(s.service.id) ?? {
      serviceName: s.service.name,
      used: 0,
      total: 0,
    };
    entry.used += slotUsed;
    entry.total += s.capacity;
    byService.set(s.service.id, entry);
  }
  return {
    occupancyToday: { used, total },
    occupancyByService: [...byService.entries()]
      .map(([serviceId, v]) => ({ serviceId, ...v }))
      .sort((a, b) => b.used / Math.max(b.total, 1) - a.used / Math.max(a.total, 1)),
  };
}

/** Serie diaria (zona Bogotá) de los últimos 14 días. `ahora` inyectable en pruebas. */
export function construirSerieDiaria(
  rows: Array<{ createdAt: Date; status: string }>,
  ahora: Date = new Date(),
): Array<{ date: string; label: string; total: number; confirmed: number }> {
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayLabel = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
  });
  const buckets = new Map<string, { total: number; confirmed: number }>();
  for (let i = 13; i >= 0; i--) {
    const ref = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dayKey.format(ref);
    buckets.set(key, { total: 0, confirmed: 0 });
  }
  for (const r of rows) {
    const key = dayKey.format(r.createdAt);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.total += 1;
      if (r.status === "confirmed" || r.status === "used") bucket.confirmed += 1;
    }
  }
  return [...buckets.entries()].map(([date, v]) => ({
    date,
    label: dayLabel.format(new Date(`${date}T12:00:00`)),
    total: v.total,
    confirmed: v.confirmed,
  }));
}

export type FilaIngreso = {
  amountCop: number;
  reservation: { service: { id: string; name: string; category: { name: string } } };
};

/** Agregación pura de pagos: total + por servicio + por categoría (desc). */
export function agregarIngresos(rows: FilaIngreso[]): {
  totalIngresosCop: number;
  ingresosPorServicio: Array<{ serviceId: string; serviceName: string; totalCop: number }>;
  ingresosPorCategoria: Array<{ categoryName: string; totalCop: number }>;
} {
  let totalIngresosCop = 0;
  const porServicio = new Map<string, { serviceName: string; totalCop: number }>();
  const porCategoria = new Map<string, number>();
  for (const r of rows) {
    totalIngresosCop += r.amountCop;
    const s = r.reservation.service;
    const entry = porServicio.get(s.id) ?? { serviceName: s.name, totalCop: 0 };
    entry.totalCop += r.amountCop;
    porServicio.set(s.id, entry);
    porCategoria.set(s.category.name, (porCategoria.get(s.category.name) ?? 0) + r.amountCop);
  }
  return {
    totalIngresosCop,
    ingresosPorServicio: [...porServicio.entries()]
      .map(([serviceId, v]) => ({ serviceId, ...v }))
      .sort((a, b) => b.totalCop - a.totalCop),
    ingresosPorCategoria: [...porCategoria.entries()]
      .map(([categoryName, totalCop]) => ({ categoryName, totalCop }))
      .sort((a, b) => b.totalCop - a.totalCop),
  };
}

export type FilaReservaRango = {
  service: { id: string; name: string; category: { name: string } };
};

/** Agregación pura de reservas del rango: total + por servicio + por categoría. */
export function agregarReservasPorRango(rows: FilaReservaRango[]): {
  totalReservas: number;
  reservasPorServicio: Array<{ serviceId: string; serviceName: string; total: number }>;
  reservasPorCategoria: Array<{ categoryName: string; total: number }>;
} {
  const porServicio = new Map<string, { serviceName: string; total: number }>();
  const porCategoria = new Map<string, number>();
  for (const r of rows) {
    const entry = porServicio.get(r.service.id) ?? { serviceName: r.service.name, total: 0 };
    entry.total += 1;
    porServicio.set(r.service.id, entry);
    porCategoria.set(r.service.category.name, (porCategoria.get(r.service.category.name) ?? 0) + 1);
  }
  return {
    totalReservas: rows.length,
    reservasPorServicio: [...porServicio.entries()]
      .map(([serviceId, v]) => ({ serviceId, ...v }))
      .sort((a, b) => b.total - a.total),
    reservasPorCategoria: [...porCategoria.entries()]
      .map(([categoryName, total]) => ({ categoryName, total }))
      .sort((a, b) => b.total - a.total),
  };
}

/**
 * (§20): ingresos y reservas por rango de fechas de franja.
 * Los ingresos se acotan por `paidAt` (cuándo entró el dinero) y las
 * reservas por `startsAt` (cuándo ocurre el servicio). Dos lecturas en una
 * oleada: el pooler admite hasta 3 simultáneas.
 */
export async function getMetricasRango(
  desde: string | undefined,
  hasta: string | undefined,
): Promise<MetricasRango> {
  const { start, end, desdeKey, hastaKey } = sanearRangoMetricas(desde, hasta);
  const [pagos, reservas] = await Promise.all([
    db.payment.findMany({
      where: { status: "succeeded", paidAt: { gte: start, lt: end } },
      select: {
        amountCop: true,
        reservation: {
          select: { service: { select: { id: true, name: true, category: { select: { name: true } } } } },
        },
      },
    }),
    db.reservation.findMany({
      where: { startsAt: { gte: start, lt: end } },
      select: { service: { select: { id: true, name: true, category: { select: { name: true } } } } },
    }),
  ]);
  const ingresos = agregarIngresos(pagos);
  const conteo = agregarReservasPorRango(reservas);
  return {
    desde: desdeKey,
    hasta: hastaKey,
    totalIngresosCop: ingresos.totalIngresosCop,
    ingresosPorServicio: ingresos.ingresosPorServicio,
    ingresosPorCategoria: ingresos.ingresosPorCategoria,
    totalReservas: conteo.totalReservas,
    reservasPorServicio: conteo.reservasPorServicio,
    reservasPorCategoria: conteo.reservasPorCategoria,
  };
}

/**
 * (§20): ocupación de una fecha configurable. Misma agregación que
 * el overview de hoy (`agregarOcupacion`), pero sobre el día Bogotá pedido;
 * fecha inválida o ausente cae a hoy.
 */
export async function getOcupacionPorFecha(fecha: string | undefined): Promise<OcupacionFecha> {
  const valida = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
  const ref = valida ? new Date(`${valida}T12:00:00Z`) : new Date();
  const { start, end } = bogotaDayRange(ref);
  const slots = await db.serviceSlot.findMany({
    where: { startsAt: { gte: start, lt: end } },
    select: {
      capacity: true,
      bookedCount: true,
      heldCount: true,
      service: { select: { id: true, name: true } },
    },
  });
  const { occupancyToday, occupancyByService } = agregarOcupacion(slots);
  return { fecha: valida ?? claveDiaBogota(new Date()), occupancyToday, occupancyByService };
}

/**
 * (§20): reservas usadas vs no usadas en el rango (fecha de franja).
 * Usada = `status used`. No usada = `confirmed` con `endsAt` pasado y ningún
 * QR consumido. Dos conteos en una oleada.
 */
export async function getUsoReservas(
  desde: string | undefined,
  hasta: string | undefined,
  ahora: Date = new Date(),
): Promise<UsoReservas> {
  const { start, end } = sanearRangoMetricas(desde, hasta, ahora);
  const rango = { startsAt: { gte: start, lt: end } };
  const [usadas, noUsadas] = await Promise.all([
    db.reservation.count({ where: { ...rango, status: "used" } }),
    db.reservation.count({
      where: {
        ...rango,
        status: "confirmed",
        endsAt: { lt: ahora },
        qrTokens: { none: { usedAt: { not: null } } },
      },
    }),
  ]);
  return { usadas, noUsadas };
}

/**
 * Conteos para las tarjetas de `/admin/reportes`. Un solo roundtrip con
 * UNION ALL: la página traía listas completas (servicios con horarios, 100
 * clientes, filas con includes) solo para mostrar el total, y eso costaba
 * ~5 s secuenciales. Cada roundtrip al pooler cuesta ~270 ms, así que 5
 * `count()` en oleada seguirían costando ~1 s.
 */
export async function getConteosReportes(): Promise<{
  reservas: number;
  accesos: number;
  servicios: number;
  empleados: number;
  clientes: number;
}> {
  const filas = await db.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*)::bigint AS total FROM "Reservation"
    UNION ALL SELECT COUNT(*) FROM "Access"
    UNION ALL SELECT COUNT(*) FROM "Service"
    UNION ALL SELECT COUNT(*) FROM "Employee"
    UNION ALL SELECT COUNT(*) FROM "Customer"
  `;
  const [reservas, accesos, servicios, empleados, clientes] = filas.map((f) => Number(f.total));
  return { reservas, accesos, servicios, empleados, clientes };
}

export async function getDashboardOverview(): Promise<DashboardOverview> {  const { start: todayStart, end: todayEnd } = bogotaDayRange();  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Lecturas independientes en oleadas de 3: el pooler (session mode, 15
  // conexiones) colapsa con 10 consultas simultáneas, pero en secuencia
  // suman ~5s de roundtrips. 3 oleadas ≈ 1s con máximo 3 conexiones.
  // (servicesCount/customersCount se eliminaron: ninguna vista los usaba.)
  const [statusGroups, revenue, accessesToday] = await Promise.all([
    db.reservation.groupBy({ by: ["status"], _count: { status: true } }),
    db.payment.aggregate({
      _sum: { amountCop: true },
      where: { status: "succeeded" },
    }),
    db.access.groupBy({
      by: ["result"],
      _count: { result: true },
      where: { accessedAt: { gte: todayStart, lt: todayEnd } },
    }),
  ]);
  const [holdsActive, todaySlots, last14] = await Promise.all([
    db.reservationHold.count({
      where: { status: "active", expiresAt: { gt: new Date() } },
    }),
    db.serviceSlot.findMany({
      where: { startsAt: { gte: todayStart, lt: todayEnd } },
      select: {
        capacity: true,
        bookedCount: true,
        heldCount: true,
        service: { select: { id: true, name: true } },
      },
    }),
    db.reservation.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const [recentReservations, recentAccesses] = await Promise.all([
    db.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: reservationInclude,
    }),
    db.access.findMany({
      orderBy: { accessedAt: "desc" },
      take: 6,
      include: {
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
        qrToken: {
          include: {
            reservation: {
              include: {
                customer: {
                  include: { user: { select: { firstName: true, lastName: true } } },
                },
                service: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const { reservationsByStatus, totalReservations } = agregarReservasPorEstado(statusGroups);

  const accessesAllowedToday =
    accessesToday.find((g) => g.result === "allowed")?._count.result ?? 0;
  const accessesDeniedToday =
    accessesToday.find((g) => g.result === "denied")?._count.result ?? 0;

  const { occupancyToday, occupancyByService } = agregarOcupacion(todaySlots);

  const dailySeries = construirSerieDiaria(last14);

  return {
    reservationsByStatus,
    totalReservations,
    revenueCop: revenue._sum.amountCop ?? 0,
    accessesToday: accessesAllowedToday + accessesDeniedToday,
    accessesAllowedToday,
    accessesDeniedToday,
    holdsActive,
    occupancyToday,
    occupancyByService,
    dailySeries,
    recentReservations: recentReservations as ReservationRow[],
    recentAccesses: recentAccesses as AccessRow[],
  };
}

export interface ReservationFilters {
  status?: string;
  serviceId?: string;
  channel?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function buildReservationWhere(f: ReservationFilters) {
  const where: NonNullable<Parameters<typeof db.reservation.findMany>[0]>["where"] = {};
  if (f.status && (RESERVATION_STATUSES as readonly string[]).includes(f.status)) {
    where.status = f.status as ReservationRow["status"];
  }
  if (f.serviceId) where.serviceId = f.serviceId;
  if (f.channel && ["online", "in_person"].includes(f.channel)) {
    where.channel = f.channel as ReservationRow["channel"];
  }
  if (f.from || f.to) {
    where.startsAt = {};
    if (f.from) where.startsAt.gte = new Date(`${f.from}T00:00:00-05:00`);
    if (f.to) where.startsAt.lte = new Date(`${f.to}T23:59:59-05:00`);
  }
  const q = f.q?.trim();
  if (q) {
    where.OR = [
      { customer: { user: { firstName: { contains: q, mode: "insensitive" } } } },
      { customer: { user: { lastName: { contains: q, mode: "insensitive" } } } },
      { customer: { user: { email: { contains: q, mode: "insensitive" } } } },
      { customer: { document: { contains: q, mode: "insensitive" } } },
      { service: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

export async function listReservations(
  filters: ReservationFilters,
): Promise<Paginated<ReservationRow>> {
  const page = sanitizePage(filters.page);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 10, 1), 50);
  const where = buildReservationWhere(filters);
  const [total, rows] = await Promise.all([
    db.reservation.count({ where }),
    db.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: reservationListInclude,
    }),
  ]);
  return {
    rows: rows as ReservationRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function getReservationDetail(id: string): Promise<ReservationDetail | null> {
  const row = await db.reservation.findUnique({
    where: { id },
    include: {
      customer: { include: { user: true } },
      service: { include: { category: true } },
      creator: { select: { firstName: true, lastName: true, email: true } },
      payments: { orderBy: { createdAt: "desc" } },
      holds: { orderBy: { createdAt: "desc" } },
      qrTokens: {
        orderBy: { seqNo: "asc" },
        include: { accesses: { include: { employee: { include: { user: true } } } } },
      },
      slots: { include: { slot: true } },
    },
  });
  return row as ReservationDetail | null;
}

export async function listServices(): Promise<ServiceRow[]> {
  const now = new Date();
  const rows = await db.service.findMany({
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      serviceSchedules: { orderBy: { dayOfWeek: "asc" } },
      _count: {
        select: {
          reservations: {
            where: { startsAt: { gte: now }, status: { in: ["confirmed", "pending_payment"] } },
          },
        },
      },
    },
  });
  return rows as ServiceRow[];
}

export async function listServicesLight(): Promise<ServiceRow[]> {
  const rows = await db.service.findMany({
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    take: 5,
    include: {
      category: { select: { name: true } },
    },
  });
  return rows as ServiceRow[];
}

export async function listServiceOptions(): Promise<Array<{ id: string; name: string }>> {
  return db.service.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function upsertServiceSchedule(input: {
  serviceId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}) {
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new Error("El día de la semana debe estar entre 0 y 6.");
  }
  const start = input.openTime.trim();
  const end = input.closeTime.trim();
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    throw new Error("Horas inválidas. Usa formato HH:MM.");
  }
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw new Error("La instalación seleccionada no existe.");

  const schedule = await db.serviceSchedule.upsert({
    where: {
      serviceId_dayOfWeek: {
        serviceId: input.serviceId,
        dayOfWeek: input.dayOfWeek,
      },
    },
    update: {
      openTime: start,
      closeTime: end,
    },
    create: {
      serviceId: input.serviceId,
      dayOfWeek: input.dayOfWeek,
      openTime: start,
      closeTime: end,
    },
  });

  const { generateServiceSlotsForRange } = await import("@/features/availability/availability.repository");
  await generateServiceSlotsForRange(input.serviceId);

  return schedule;
}

export async function deleteServiceSchedule(serviceId: string, dayOfWeek: number) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("El día de la semana debe estar entre 0 y 6.");
  }
  const existing = await db.serviceSchedule.findUnique({
    where: { serviceId_dayOfWeek: { serviceId, dayOfWeek } },
  });
  if (!existing) throw new Error("Ese horario ya no existe.");

  // Inicio del día en Bogotá (no medianoche del servidor) y fin en el último
  // día reservable: el rango a revisar cubre lo mismo que la generación (P2-3).
  const hoyBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = new Date(`${hoyBogota}T05:00:00.000Z`);
  const finVentana = new Date(`${ultimoDiaReservable(hoyBogota)}T05:00:00.000Z`);
  finVentana.setDate(finVentana.getDate() + 1);

  const slots = await db.serviceSlot.findMany({
    where: {
      serviceId,
      startsAt: { gte: today, lt: finVentana },
    },
    select: { id: true, startsAt: true },
  });

  // P1-8: el día de semana se calcula en Bogotá con `diaDeSemana` (0 = domingo,
  // igual que ServiceSchedule). El código anterior parseaba `YYYY-MM-DD` como
  // UTC y usaba `getDay()` del servidor: según la zona borraba los slots del
  // día equivocado o no borraba nada.
  const ids = slots
    .filter((slot) => {
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(slot.startsAt);
      return diaDeSemana(dateKey) === dayOfWeek;
    })
    .map((slot) => slot.id);

  return db.$transaction(async (tx) => {
    if (ids.length > 0) {
      await tx.serviceSlot.deleteMany({ where: { id: { in: ids } } });
    }

    return tx.serviceSchedule.delete({
      where: { serviceId_dayOfWeek: { serviceId, dayOfWeek } },
    });
  });
}

export async function getServiceDetail(id: string): Promise<ServiceRow | null> {
  const row = await db.service.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      serviceSchedules: { orderBy: { dayOfWeek: "asc" } },
      _count: {
        select: {
          reservations: {
            where: { startsAt: { gte: new Date() }, status: { in: ["confirmed", "pending_payment"] } },
          },
        },
      },
    },
  });
  return row as ServiceRow | null;
}

// ---------------------------------------------------------------------------
// CRUD de servicios (SCRUM sección 5). Sin esto todo cambio iba por
// seed/SQL. Reglas: slug único derivado del nombre, capacidad nunca bajo lo
// vendido en franjas futuras, desactivar no toca reservas vivas, y lo nuevo
// rige franjas futuras (las pasadas son historia).
// ---------------------------------------------------------------------------

export type ServiceCreateData = {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  imagen?: string;
  isActive?: boolean;
};

export type ServiceUpdateData = {
  categoryId?: string;
  name?: string;
  description?: string | null;
  price?: number;
  capacity?: number;
  imagen?: string | null;
  isActive?: boolean;
};

function rethrowServiceDuplicado(error: unknown): void {
  if ((error as { code?: string })?.code === "P2002") {
    throw new Error("Ya existe un servicio con ese nombre.");
  }
}

export async function createService(input: ServiceCreateData) {
  const category = await db.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new NotFoundError("La categoría seleccionada no existe.");

  const name = input.name.trim();
  const slug = slugifyCategory(name);
  if (!slug) throw new Error("El nombre debe contener letras o números.");
  const dupe = await db.service.findFirst({
    where: { OR: [{ name }, { slug }] },
    select: { id: true },
  });
  if (dupe) throw new ConflictError("Ya existe un servicio con ese nombre.");

  try {
    return await db.service.create({
      data: {
        categoryId: input.categoryId,
        name,
        slug,
        description: input.description?.trim() ? input.description.trim() : null,
        price: input.price,
        capacity: input.capacity,
        imagen: input.imagen?.trim() ? input.imagen.trim() : null,
        isActive: input.isActive ?? true,
      },
    });
    // Tras crear, el admin configura los horarios: cada upsert genera sus slots.
  } catch (error) {
    rethrowServiceDuplicado(error);
    throw error;
  }
}

export async function updateService(id: string, input: ServiceUpdateData) {
  const existing = await db.service.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("El servicio no existe.");

  if (input.categoryId !== undefined) {
    const category = await db.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new NotFoundError("La categoría seleccionada no existe.");
  }

  const data: Record<string, unknown> = {};
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.name !== undefined) {
    const name = input.name.trim();
    const slug = slugifyCategory(name);
    if (!slug) throw new Error("El nombre debe contener letras o números.");
    const dupe = await db.service.findFirst({
      where: { OR: [{ name }, { slug }], id: { not: id } },
      select: { id: true },
    });
    if (dupe) throw new ConflictError("Ya existe otro servicio con ese nombre.");
    data.name = name;
    data.slug = slug;
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() ? input.description.trim() : null;
  }
  if (input.price !== undefined) data.price = input.price;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.imagen !== undefined) {
    data.imagen = input.imagen?.trim() ? input.imagen.trim() : null;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;

  // Guard de capacidad: ninguna franja futura puede quedar con más cupos
  // vendidos que la nueva capacidad. Si pasa, las futuras heredan la nueva.
  const cambiaCapacidad = input.capacity !== undefined && input.capacity !== existing.capacity;
  if (cambiaCapacidad) {
    const futuros = await db.serviceSlot.findMany({
      where: { serviceId: id, startsAt: { gte: new Date() } },
      select: { bookedCount: true, heldCount: true },
    });
    if (futuros.some((s) => s.bookedCount + s.heldCount > (input.capacity as number))) {
      throw new Error("Hay franjas futuras con más cupos vendidos que la nueva capacidad.");
    }
  }

  try {
    return await db.$transaction(async (tx) => {
      const updated = await tx.service.update({ where: { id }, data: data as never });
      if (cambiaCapacidad) {
        await tx.serviceSlot.updateMany({
          where: { serviceId: id, startsAt: { gte: new Date() } },
          data: { capacity: input.capacity as number },
        });
      }
      return updated;
    });
  } catch (error) {
    rethrowServiceDuplicado(error);
    throw error;
  }
}

/**
 * Activa o desactiva la instalación en el catálogo. Desactivar oculta sin
 * borrar: las reservas existentes (incluso futuras) se respetan y el QR sigue
 * validando; solo se cierra la venta nueva.
 */
export async function setServiceActive(id: string, isActive: boolean) {
  const existing = await db.service.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("El servicio no existe.");
  return db.service.update({ where: { id }, data: { isActive } });
}

export async function listClosures(): Promise<ClosureRow[]> {
  const rows = await db.serviceClosure.findMany({
    orderBy: { dateFrom: "asc" },
    include: { service: { select: { id: true, name: true } } },
  });
  return rows as ClosureRow[];
}

export async function createClosure(input: {
  serviceId: string | null;
  dateFrom: string;
  dateTo: string;
  reason: string;
}) {
  const dateFrom = new Date(`${input.dateFrom}T00:00:00-05:00`);
  const dateTo = new Date(`${input.dateTo}T00:00:00-05:00`);
  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
    throw new Error("Fechas inválidas.");
  }
  if (dateTo < dateFrom) {
    throw new Error("La fecha de fin no puede ser anterior a la de inicio.");
  }
  const reason = input.reason.trim();
  if (reason.length < 4) {
    throw new Error("Indica un motivo del bloqueo (mínimo 4 caracteres).");
  }
  if (input.serviceId) {
    const service = await db.service.findUnique({ where: { id: input.serviceId } });
    if (!service) throw new Error("La instalación seleccionada no existe.");
  }
  return db.serviceClosure.create({
    data: {
      serviceId: input.serviceId,
      dateFrom,
      dateTo,
      reason,
    },
  });
}

export async function deleteClosure(id: string) {
  const existing = await db.serviceClosure.findUnique({ where: { id } });
  if (!existing) throw new Error("El bloqueo ya no existe.");
  return db.serviceClosure.delete({ where: { id } });
}

export interface AccessFilters {
  result?: string;
  serviceId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function buildAccessWhere(f: AccessFilters) {
  const where: NonNullable<Parameters<typeof db.access.findMany>[0]>["where"] = {};
  if (f.result && ["allowed", "denied"].includes(f.result)) {
    where.result = f.result as AccessRow["result"];
  }
  if (f.from || f.to) {
    where.accessedAt = {};
    if (f.from) where.accessedAt.gte = new Date(`${f.from}T00:00:00-05:00`);
    if (f.to) where.accessedAt.lte = new Date(`${f.to}T23:59:59-05:00`);
  }
  const reservationFilter: Record<string, unknown> = {};
  let hasReservationFilter = false;
  const qrTokenOr: Array<Record<string, unknown>> = [];
  if (f.serviceId) {
    // P1-7: la zona del acceso es la del bloque del QR, no la principal de la
    // reserva. Sin bloque (QR legacy) se usa la reserva.
    qrTokenOr.push(
      { block: { serviceId: f.serviceId } },
      { blockId: null, reservation: { serviceId: f.serviceId } },
    );
  }
  const q = f.q?.trim();
  if (q) {
    reservationFilter.OR = [
      { customer: { user: { firstName: { contains: q, mode: "insensitive" } } } },
      { customer: { user: { lastName: { contains: q, mode: "insensitive" } } } },
      { customer: { document: { contains: q, mode: "insensitive" } } },
    ];
    hasReservationFilter = true;
  }
  if (hasReservationFilter || qrTokenOr.length > 0) {
    const qrTokenFilter: Record<string, unknown> = {};
    if (hasReservationFilter) qrTokenFilter.reservation = reservationFilter as never;
    if (qrTokenOr.length > 0) qrTokenFilter.OR = qrTokenOr as never;
    where.qrToken = qrTokenFilter as never;
  }
  return where;
}

export async function listAccesses(filters: AccessFilters): Promise<Paginated<AccessRow>> {
  const page = sanitizePage(filters.page);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 10, 1), 50);
  const where = buildAccessWhere(filters);
  const [total, rows] = await Promise.all([
    db.access.count({ where }),
    db.access.findMany({
      where,
      orderBy: { accessedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
        qrToken: {
          include: {
            block: { select: { service: { select: { id: true, name: true } } } },
            reservation: {
              include: {
                customer: {
                  include: { user: { select: { firstName: true, lastName: true } } },
                },
                service: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  return {
    rows: rows as AccessRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function listEmployees(search?: string): Promise<EmployeeRow[]> {
  const q = search?.trim();
  const rows = await db.employee.findMany({
    where: q
      ? {
          OR: [
            { user: { firstName: { contains: q, mode: "insensitive" } } },
            { user: { lastName: { contains: q, mode: "insensitive" } } },
            { document: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { user: { firstName: "asc" } },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, phone: true, isActive: true },
      },
      assignments: { include: { service: { select: { id: true, name: true } } } },
      _count: { select: { accesses: true } },
    },
  });
  return rows as EmployeeRow[];
}

export async function listCustomers(search?: string): Promise<{ rows: CustomerRow[]; total: number }> {
  const q = search?.trim();
  const where: Prisma.CustomerWhereInput | undefined = q
    ? {
        OR: [
          { user: { firstName: { contains: q, mode: "insensitive" } } },
          { user: { lastName: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
          { document: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;
  const [total, rows] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: { user: { createdAt: "desc" } },
      take: 100,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: { select: { reservations: true } },
      },
    }),
  ]);
  return { rows: rows as CustomerRow[], total };
}

// ---------------------------------------------------------------------------
// Gestión de empleados (SCRUM sección 21).
// Cada empleado tiene una zona asignada; solo valida QR de esas instalaciones.
// ---------------------------------------------------------------------------

const employeeInclude = {
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  },
  assignments: { include: { service: { select: { id: true, name: true } } } },
  _count: { select: { accesses: true } },
} as const;

/** Rol de empleado; se crea si la base todavía no lo tiene. */
async function employeeRoleId(): Promise<string> {
  const role = await db.role.findFirst({ where: { name: "employee" as const } });
  if (role) return role.id;
  const created = await db.role.create({ data: { name: "employee" as const } });
  return created.id;
}

/** Falla con un mensaje claro si el correo ya está en uso. */
async function assertEmailAvailable(email: string, excludeUserId?: string): Promise<void> {
  const clash = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (clash && clash.id !== excludeUserId) {
    throw new Error("Ese correo ya está registrado en el sistema.");
  }
}

/** Falla con un mensaje claro si el documento ya está en uso. */
async function assertDocumentAvailable(document: string, excludeId?: string): Promise<void> {
  const clash = await db.employee.findUnique({ where: { document }, select: { id: true } });
  if (clash && clash.id !== excludeId) {
    throw new Error("Ese documento ya está registrado como empleado.");
  }
}

/** Valida que todas las zonas existan antes de guardar la asignación. */
async function assertServicesExist(serviceIds: string[]): Promise<void> {
  const unique = [...new Set(serviceIds)];
  const count = await db.service.count({ where: { id: { in: unique } } });
  if (count !== unique.length) {
    throw new Error("Alguna de las zonas seleccionadas ya no existe.");
  }
}

export async function getEmployeeDetail(id: string): Promise<EmployeeDetailRow | null> {
  const row = await db.employee.findUnique({ where: { id }, include: employeeInclude });
  return (row as EmployeeDetailRow | null) ?? null;
}

/** Instalaciones agrupadas por categoría, para elegir las zonas del empleado. */
export async function listZoneOptions(): Promise<ZoneGroup[]> {
  const services = await db.service.findMany({
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: { select: { id: true, name: true } },
    },
  });

  const groups = new Map<string, ZoneGroup>();
  for (const service of services) {
    let group = groups.get(service.category.id);
    if (!group) {
      group = { categoryId: service.category.id, categoryName: service.category.name, services: [] };
      groups.set(service.category.id, group);
    }
    group.services.push({ id: service.id, name: service.name });
  }
  return [...groups.values()];
}

export async function createEmployee(input: {
  firstName: string;
  lastName: string;
  document: string;
  email: string;
  phone: string;
  password: string;
  serviceIds: string[];
}): Promise<{ id: string }> {
  await assertEmailAvailable(input.email);
  await assertDocumentAvailable(input.document);
  await assertServicesExist(input.serviceIds);
  const roleId = await employeeRoleId();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const serviceIds = [...new Set(input.serviceIds)];

  // Usuario + empleado + zonas en una sola transacción: nunca queda un
  // empleado creado sin credenciales ni sin zona asignada.
  const employee = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        roleId,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
    });
    const created = await tx.employee.create({
      data: {
        userId: user.id,
        document: input.document,
        assignments: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
    return created;
  });

  return { id: employee.id };
}

export async function updateEmployeeProfile(
  id: string,
  input: { firstName: string; lastName: string; document: string; phone: string },
): Promise<void> {
  const employee = await db.employee.findUnique({ where: { id }, select: { userId: true } });
  if (!employee) throw new Error("El empleado ya no existe.");

  await assertDocumentAvailable(input.document, id);
  await db.user.update({
    where: { id: employee.userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    },
  });
  await db.employee.update({ where: { id }, data: { document: input.document } });
}

/**
 * Activa o desactiva al empleado. Se sincroniza User.isActive para que el
 * inicio de sesión también lo respete, no solo el módulo de validación.
 */
export async function setEmployeeActive(id: string, isActive: boolean): Promise<void> {
  const employee = await db.employee.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!employee) throw new Error("El empleado ya no existe.");

  await db.$transaction([
    db.employee.update({ where: { id }, data: { isActive } }),
    db.user.update({ where: { id: employee.userId }, data: { isActive } }),
  ]);
}

/** Reemplaza el conjunto completo de zonas asignadas. */
export async function setEmployeeZones(id: string, serviceIds: string[]): Promise<void> {
  const employee = await db.employee.findUnique({ where: { id }, select: { id: true } });
  if (!employee) throw new Error("El empleado ya no existe.");

  await assertServicesExist(serviceIds);
  const unique = [...new Set(serviceIds)];

  await db.$transaction(async (tx) => {
    await tx.employeeAssignment.deleteMany({ where: { employeeId: id } });
    if (unique.length > 0) {
      await tx.employeeAssignment.createMany({
        data: unique.map((serviceId) => ({ employeeId: id, serviceId })),
      });
    }
  });
}

export async function setEmployeePassword(id: string, password: string): Promise<void> {
  const employee = await db.employee.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!employee) throw new Error("El empleado ya no existe.");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.update({ where: { id: employee.userId }, data: { passwordHash } });
}

/** Accesos registrados por un empleado concreto (SCRUM: "consultar sus accesos"). */
export async function listEmployeeAccesses(
  employeeId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<Paginated<EmployeeAccessRow>> {
  const page = sanitizePage(opts.page);
  const pageSize = Math.min(Math.max(Number.isFinite(opts.pageSize) ? Number(opts.pageSize) : 10, 1), 50);
  const where = { employeeId };
  const [total, rows] = await Promise.all([
    db.access.count({ where }),
    db.access.findMany({
      where,
      orderBy: { accessedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        qrToken: {
          select: {
            seqNo: true,
            reservation: {
              select: {
                startsAt: true,
                service: { select: { name: true } },
                customer: {
                  select: {
                    document: true,
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  return {
    rows: rows as EmployeeAccessRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}
