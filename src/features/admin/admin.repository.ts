import bcrypt from "bcryptjs";
import { db } from "@/shared/lib/db";
import type { Prisma } from "@prisma/client";

import type {
  AccessRow,
  ClosureRow,
  CustomerRow,
  DashboardOverview,
  EmployeeAccessRow,
  EmployeeDetailRow,
  EmployeeRow,
  Paginated,
  ReservationDetail,
  ReservationRow,
  ServiceRow,
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

const reservationInclude = {
  customer: {
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  },
  service: { include: { category: { select: { name: true } } } },
  payments: { orderBy: { createdAt: "desc" as const } },
  holds: { where: { status: "active" as const } },
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

export async function getDashboardOverview(): Promise<DashboardOverview> {  const { start: todayStart, end: todayEnd } = bogotaDayRange();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

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
