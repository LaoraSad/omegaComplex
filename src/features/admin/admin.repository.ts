import { db } from "@/shared/lib/db";
import type { Prisma } from "@prisma/client";

import type {
  AccessRow,
  ClosureRow,
  CustomerRow,
  DashboardOverview,
  EmployeeRow,
  Paginated,
  ReservationDetail,
  ReservationRow,
  ServiceRow,
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

const reservationInclude = {
  customer: {
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  },
  service: { include: { category: { select: { name: true } } } },
  payments: { orderBy: { createdAt: "desc" as const } },
  holds: { where: { status: "active" as const } },
  _count: { select: { qrTokens: true } },
} as const;

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { start: todayStart, end: todayEnd } = bogotaDayRange();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Consultas en secuencia (no en paralelo): el pool de la base de datos es
  // limitado y el panel debe degradarse con gracia, no agotar conexiones.
  const statusGroups = await db.reservation.groupBy({ by: ["status"], _count: { status: true } });
  const revenue = await db.payment.aggregate({
    _sum: { amountCop: true },
    where: { status: "succeeded" },
  });
  const accessesToday = await db.access.groupBy({
    by: ["result"],
    _count: { result: true },
    where: { accessedAt: { gte: todayStart, lt: todayEnd } },
  });
  const holdsActive = await db.reservationHold.count({
    where: { status: "active", expiresAt: { gt: new Date() } },
  });
  const servicesCount = await db.service.count();
  const customersCount = await db.customer.count();
  const todaySlots = await db.serviceSlot.findMany({
    where: { startsAt: { gte: todayStart, lt: todayEnd } },
    select: {
      capacity: true,
      bookedCount: true,
      heldCount: true,
      service: { select: { id: true, name: true } },
    },
  });
  const recentReservations = await db.reservation.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: reservationInclude,
  });
  const recentAccesses = await db.access.findMany({
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
  });
  const last14 = await db.reservation.findMany({
    where: { createdAt: { gte: fourteenDaysAgo } },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const reservationsByStatus: Record<string, number> = {};
  let totalReservations = 0;
  for (const g of statusGroups) {
    reservationsByStatus[g.status] = g._count.status;
    totalReservations += g._count.status;
  }

  const accessesAllowedToday =
    accessesToday.find((g) => g.result === "allowed")?._count.result ?? 0;
  const accessesDeniedToday =
    accessesToday.find((g) => g.result === "denied")?._count.result ?? 0;

  let occupancyToday: { used: number; total: number } | null = null;
  const byService = new Map<string, { serviceName: string; used: number; total: number }>();
  if (todaySlots.length > 0) {
    let used = 0;
    let total = 0;
    for (const s of todaySlots) {
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
    occupancyToday = { used, total };
  }

  // Serie diaria (zona Bogota) de los ultimos 14 dias.
  const buckets = new Map<string, { total: number; confirmed: number }>();
  for (let i = 13; i >= 0; i--) {
    const ref = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(ref);
    buckets.set(key, { total: 0, confirmed: 0 });
  }
  for (const r of last14) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(r.createdAt);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.total += 1;
      if (r.status === "confirmed" || r.status === "used") bucket.confirmed += 1;
    }
  }
  const dailySeries = [...buckets.entries()].map(([date, v]) => ({
    date,
    label: new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      day: "numeric",
      month: "short",
    }).format(new Date(`${date}T12:00:00`)),
    total: v.total,
    confirmed: v.confirmed,
  }));

  return {
    reservationsByStatus,
    totalReservations,
    revenueCop: revenue._sum.amountCop ?? 0,
    accessesToday: accessesAllowedToday + accessesDeniedToday,
    accessesAllowedToday,
    accessesDeniedToday,
    holdsActive,
    servicesCount,
    customersCount,
    occupancyToday,
    occupancyByService: [...byService.entries()]
      .map(([serviceId, v]) => ({ serviceId, ...v }))
      .sort((a, b) => b.used / Math.max(b.total, 1) - a.used / Math.max(a.total, 1)),
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
      include: reservationInclude,
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

export async function listServiceOptions(): Promise<Array<{ id: string; name: string }>> {
  return db.service.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
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
  if (f.serviceId) {
    reservationFilter.serviceId = f.serviceId;
    hasReservationFilter = true;
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
  if (hasReservationFilter) {
    where.qrToken = { reservation: reservationFilter as never };
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
