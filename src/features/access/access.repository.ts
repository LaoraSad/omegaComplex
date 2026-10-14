// Persistencia de control de acceso: empleado por usuario, lookup de QR por hash/código, otorga acceso y métricas.
import { createHash } from "node:crypto";

import { db } from "@/shared/lib/db";
import { looksLikeShortCode, normalizeShortCode } from "@/features/access/short-code";

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
  /** Persona a la que pertenece este QR. Es la que debe estar en la puerta. */
  guestName: string;
  guestDocument: string | null;
  guestIsTitular: boolean;
  serviceId: string | null;
  serviceName: string;
  categoryName: string;
  accessCount: number;
};

/**
 * Localiza el QR a partir de lo que el empleado entrega.
 *
 * Acepta el token crudo que viene dentro de la imagen del QR y también el código
 * corto transcribible (por si la cámara falla). El hash se calcula una sola vez
 * aquí: la base de datos solo guarda el SHA-256, nunca el token en claro.
 */
export async function findQrByTokenHash(rawArg: string): Promise<QrLookup | null> {
  const trimmed = rawArg.trim();
  const tokenHash = hashAccessToken(trimmed);
  const shortCode = normalizeShortCode(trimmed);

  const selectFields = {
    id: true,
    seqNo: true,
    status: true,
    usedAt: true,
    _count: { select: { accesses: { where: { result: "allowed" as const } } } },
    // La persona que trae el QR. Si por lo que sea no estuviera enlazada, se
    // cae al titular de la reserva para no dejar la ficha vacía.
    guest: { select: { fullName: true, document: true, isTitular: true } },
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

  // Respaldo manual: el empleado teclea el código corto impreso en el correo.
  if (!token && looksLikeShortCode(trimmed)) {
    token = await db.qrToken.findUnique({
      where: { shortCode },
      select: selectFields,
    });
  }

  // Solo token seguro (hash) o código corto impreso: nada de UUID ni
  // reservationId. Esos identificadores son visibles en APIs/admin y
  // permitirían validar sin el token (requisito §14: token seguro).
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
    guestName:
      token.guest?.fullName ??
      `${token.reservation.customer.user.firstName} ${token.reservation.customer.user.lastName}`.trim(),
    guestDocument: token.guest?.document ?? token.reservation.customer.document,
    guestIsTitular: token.guest?.isTitular ?? true,
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
 * Marca un QR como expirado cuando su franja ya paso.
 *
 * El estado se escribe de forma perezosa, en el momento en que alguien lo
 * consulta: asi el panel muestra la realidad sin necesitar un cron. Solo cambia
 * si el QR sigue activo: un QR ya usado conserva su historial.
 */
export async function marcarQrExpirado(qrTokenId: string): Promise<void> {
  await db.qrToken.updateMany({
    where: { id: qrTokenId, status: "active" },
    data: { status: "expired" },
  });
}

/**
 * Registra el ingreso y consume el QR de forma atómica.
 *
 * El paso crítico es el updateMany condicionado a status = "active": si dos
 * empleados escanean el mismo QR a la vez, solo uno obtiene count = 1. Así el
 * uso único se garantiza en la base de datos, no en JavaScript (sección 18).
 *
 * Un intento denegado durante la consulta no consume el QR (el mismo código
 * puede volverse a intentar). Un denegado explícito del empleado sí lo consume:
 * esa fue su decisión y no debe rebotar en otra puerta.
 */
export async function grantAccess(input: {
  qrTokenId: string;
  employeeId: string;
  result: "allowed" | "denied";
  denialReason?: string | null;
  /** Consume el QR también en un rechazo. */
  consumeQr?: boolean;
  /** P2-5: true solo en invalidación manual (deny explícito de QR válido). */
  invalidacionManual?: boolean;
}): Promise<GrantResult> {
  const accessedAt = new Date();

  return db.$transaction(async (tx) => {
    if (input.result === "allowed" || input.consumeQr) {
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
        invalidacionManual: input.invalidacionManual ?? false,
      },
      select: { id: true },
    });

    return { ok: true, accessId: access.id, accessedAt } as const;
  });
}

/**
 * ¿Ya se registró este mismo rechazo hace poco? (P2-6)
 *
 * Cada lookup fallido se registra para auditoría, pero un empleado probando el
 * mismo QR generaba N filas idénticas que contaminan las métricas. Ventana de
 * 5 minutos por (QR, empleado, motivo): dentro de ella el duplicado se omite.
 */
export async function huboDenegacionReciente(input: {
  qrTokenId: string;
  employeeId: string;
  reason: string;
  ventanaMs?: number;
}): Promise<boolean> {
  const desde = new Date(Date.now() - (input.ventanaMs ?? 5 * 60 * 1000));
  const count = await db.access.count({
    where: {
      qrTokenId: input.qrTokenId,
      employeeId: input.employeeId,
      result: "denied",
      denialReason: input.reason,
      accessedAt: { gte: desde },
    },
  });
  return count > 0;
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