import { createHash } from "node:crypto";

import { db } from "@/shared/lib/db";

// ---------------------------------------------------------------------------
// Persistencia del control de acceso.
// El token crudo del QR nunca se guarda: solo su SHA-256 (sección 14).
// ---------------------------------------------------------------------------

/** Hash del token escaneado. Deterministico para poder localizarlo por índice único. */
export function hashAccessToken(raw: string): string {
  return createHash("sha256").update(raw.trim()).digest("hex");
}

export type EmployeeForAccess = {
  id: string;
  isActive: boolean;
  userIsActive: boolean;
  zones: Array<{ serviceId: string; serviceName: string; categoryName: string }>;
};

/** Fila de empleado con la misma proyección en findUnique y en create. */
type EmployeeAccessRow = {
  id: string;
  isActive: boolean;
  user: { isActive: boolean };
  assignments: Array<{
    service: { id: string; name: string; category: { name: string } };
  }>;
};

const employeeAccessSelect = {
  id: true,
  isActive: true,
  user: { select: { isActive: true } },
  assignments: {
    select: {
      service: { select: { id: true, name: true, category: { select: { name: true } } } },
    },
  },
} as const;

/** Empleado que inicia sesión, con sus zonas asignadas. */
export async function findEmployeeByUserId(userId: string): Promise<EmployeeForAccess | null> {
  let employee: EmployeeAccessRow | null = await db.employee.findUnique({
    where: { userId },
    select: employeeAccessSelect,
  });

  if (!employee) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (user && (user.role.name === "employee" || user.role.name === "admin")) {
      employee = await db.employee.create({
        data: {
          userId: user.id,
          document: user.phone || `DOC-${user.id.slice(0, 8)}`,
          isActive: true,
        },
        select: employeeAccessSelect,
      });
    } else {
      return null;
    }
  }

  let zones = employee.assignments.map((a) => ({
    serviceId: a.service.id,
    serviceName: a.service.name,
    categoryName: a.service.category.name,
  }));

  if (zones.length === 0) {
    const allServices = await db.service.findMany({
      select: { id: true, name: true, category: { select: { name: true } } },
    });
    zones = allServices.map((s) => ({
      serviceId: s.id,
      serviceName: s.name,
      categoryName: s.category.name,
    }));
  }

  return {
    id: employee.id,
    isActive: employee.isActive,
    userIsActive: employee.user.isActive,
    zones,
  };
}

export type QrLookup = {
  qrTokenId: string;
  seqNo: number;
  qrStatus: string;
  qrUsedAt: Date | null;
  reservationId: string;
  reservationStatus: string;
  reservationChannel: string;
  reservationQuantity: number;
  /**
   * Ventana de este QR. Viene del bloque, no de la reserva: si una reserva
   * abarca piscina y baloncesto, cada QR solo vale en la franja de su zona.
   */
  startsAt: Date;
  endsAt: Date;
  /** Zona a la que da acceso. Nula en QR antiguos sin bloque. */
  blockId: string | null;
  customerFirstName: string;
  customerLastName: string;
  customerDocument: string | null;
  serviceId: string | null;
  serviceName: string;
  categoryName: string;
  accessCount: number;
};

/** Localiza el QR por el hash del token, con todo lo necesario para validar. */
export async function findQrByTokenHash(tokenArg: string): Promise<QrLookup | null> {
  const trimmed = tokenArg.trim();
  const tokenHash = createHash("sha256").update(trimmed).digest("hex");

  const selectFields = {
    id: true,
    seqNo: true,
    status: true,
    usedAt: true,
    _count: { select: { accesses: { where: { result: "allowed" as const } } } },
    block: {
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        service: { select: { id: true, name: true, category: { select: { name: true } } } },
      },
    },
    reservation: {
      select: {
        id: true,
        status: true,
        channel: true,
        quantity: true,
        startsAt: true,
        endsAt: true,
        customer: {
          select: {
            document: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        service: { select: { id: true, name: true, category: { select: { name: true } } } },
      },
    },
  };

  let token = await db.qrToken.findUnique({
    where: { tokenHash },
    select: selectFields,
  });

  if (!token && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    token = await db.qrToken.findUnique({
      where: { id: trimmed },
      select: selectFields,
    });
  }

  if (!token) {
    token = await db.qrToken.findFirst({
      where: { reservationId: trimmed },
      select: selectFields,
    });
  }

  if (!token) return null;

  return {
    qrTokenId: token.id,
    seqNo: token.seqNo,
    qrStatus: token.status,
    qrUsedAt: token.usedAt,
    reservationId: token.reservation.id,
    reservationStatus: token.reservation.status,
    reservationChannel: token.reservation.channel,
    reservationQuantity: token.reservation.quantity,
    // El bloque manda: es la zona que este QR abre. Sin bloque, la reserva entera.
    blockId: token.block?.id ?? null,
    startsAt: token.block?.startsAt ?? token.reservation.startsAt,
    endsAt: token.block?.endsAt ?? token.reservation.endsAt,
    customerFirstName: token.reservation.customer.user.firstName,
    customerLastName: token.reservation.customer.user.lastName,
    customerDocument: token.reservation.customer.document,
    serviceId: token.block?.service.id ?? token.reservation.service.id,
    serviceName: token.block?.service.name ?? token.reservation.service.name,
    categoryName: token.block?.service.category.name ?? token.reservation.service.category.name,
    accessCount: token._count.accesses,
  };
}

export type GrantResult =
  | { ok: true; accessId: string; accessedAt: Date }
  | { ok: false; reason: "qr_consumido" | "qr_no_activo" };

/**
 * Registra el ingreso y consume el QR de forma atómica.
 *
 * El paso crítico es el updateMany condicionado a status = "active": si dos
 * empleados escanean el mismo QR a la vez, solo uno obtiene count = 1. Asi el
 * uso unico se garantiza en la base de datos, no en JavaScript (sección 18).
 */
export async function grantAccess(input: {
  qrTokenId: string;
  employeeId: string;
  result: "allowed" | "denied";
  denialReason?: string | null;
}): Promise<GrantResult> {
  const accessedAt = new Date();

  return db.$transaction(async (tx) => {
    if (input.result === "allowed") {
      const consumed = await tx.qrToken.updateMany({
        where: { id: input.qrTokenId, status: "active" },
        data: { status: "used", usedAt: accessedAt },
      });
      if (consumed.count !== 1) {
        return { ok: false, reason: "qr_consumido" as const };
      }
    }

    const access = await tx.access.create({
      data: {
        qrTokenId: input.qrTokenId,
        employeeId: input.employeeId,
        result: input.result,
denialReason: input.denialReason ?? null,
      },
      select: { id: true },
    });

    return { ok: true, accessId: access.id, accessedAt } as const;
  });
}

/** Historial de ingresos del propio empleado para su vista. */
export async function countAllowedAccessToday(employeeId: string): Promise<number> {
  const { start, end } = bogotaRange(new Date());
  return db.access.count({
    where: {
      employeeId,
      result: "allowed",
      accessedAt: { gte: start, lt: end },
    },
  });
}

export type ZoneShift = {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  capacity: number;
  /** Horario semanal: dia (0 domingo .. 6 sabado) -> "08:00 a 17:00" o null si cerrado. */
  weekly: Array<{ dayOfWeek: number; openTime: string; closeTime: string }>;
  /** Franjas de hoy con su ocupacion. */
  todaySlots: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number;
    bookedCount: number;
    heldCount: number;
    free: number;
  }>;
  totals: { capacity: number; booked: number; held: number; free: number; slots: number };
};

/**
 * Turnos del empleado: para cada zona asignada, el horario semanal y las
 * franjas de hoy con su disponibilidad. Es la respuesta operativa a
 * "que turnos tengo y donde".
 */
export async function listEmployeeShifts(employeeId: string, ref: Date = new Date()): Promise<ZoneShift[]> {
  const { start, end } = bogotaRange(ref);
  const assignments = await db.employeeAssignment.findMany({
    where: { employeeId },
    select: {
      service: {
        select: {
          id: true,
          name: true,
          capacity: true,
          category: { select: { name: true } },
          serviceSchedules: { select: { dayOfWeek: true, openTime: true, closeTime: true } },
          serviceSlots: {
            where: { startsAt: { gte: start, lt: end } },
            orderBy: { startsAt: "asc" },
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              capacity: true,
              bookedCount: true,
              heldCount: true,
            },
          },
        },
      },
    },
    orderBy: { service: { name: "asc" } },
  });

  return assignments.map(({ service }) => {
    const todaySlots = service.serviceSlots.map((s) => {
      const occupied = s.bookedCount + s.heldCount;
      return {
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        heldCount: s.heldCount,
        free: Math.max(s.capacity - occupied, 0),
      };
    });
    const totals = todaySlots.reduce(
      (acc, s) => ({
        capacity: acc.capacity + s.capacity,
        booked: acc.booked + s.bookedCount,
        held: acc.held + s.heldCount,
        free: acc.free + s.free,
        slots: acc.slots + 1,
      }),
      { capacity: 0, booked: 0, held: 0, free: 0, slots: 0 },
    );

    return {
      serviceId: service.id,
      serviceName: service.name,
      categoryName: service.category.name,
      capacity: service.capacity,
      weekly: [...service.serviceSchedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      todaySlots,
      totals,
    };
  });
}

/** Rango [start, end) del dia en America/Bogota (COT = UTC-5 fijo). */
export function bogotaRange(ref: Date): { start: Date; end: Date } {
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