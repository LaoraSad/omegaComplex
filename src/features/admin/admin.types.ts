import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos del módulo de administración.
// Todos derivan de los modelos Prisma existentes: nada se inventa aquí.
// ---------------------------------------------------------------------------

export type ReservationListWhere = Prisma.ReservationWhereInput;

export type ReservationRow = Prisma.ReservationGetPayload<{
  include: {
    customer: {
      include: { user: { select: { firstName: true; lastName: true; email: true } } };
    };
    service: { include: { category: { select: { name: true } } } };
    payments: true;
    holds: true;
    _count: { select: { qrTokens: true } };
  };
}>;

export type ReservationDetail = Prisma.ReservationGetPayload<{
  include: {
    customer: { include: { user: true } };
    service: { include: { category: true } };
    creator: { select: { firstName: true; lastName: true; email: true } };
    payments: { orderBy: { createdAt: "desc" } };
    holds: { orderBy: { createdAt: "desc" } };
    qrTokens: {
      orderBy: { seqNo: "asc" };
      include: { accesses: { include: { employee: { include: { user: true } } } } };
    };
    slots: { include: { slot: true } };
  };
}>;

export type ServiceRow = Prisma.ServiceGetPayload<{
  include: {
    category: { select: { name: true } };
    serviceSchedules: true;
    _count: { select: { reservations: true } };
  };
}>;

export type ClosureRow = Prisma.ServiceClosureGetPayload<{
  include: { service: { select: { id: true; name: true } } };
}>;

export type AccessRow = Prisma.AccessGetPayload<{
  include: {
    employee: { include: { user: { select: { firstName: true; lastName: true } } } };
    qrToken: {
      include: {
        // Zona real del QR. Nulo en QR legacy: ahí manda la reserva.
        block: { select: { service: { select: { id: true; name: true } } } };
        reservation: {
          include: {
            customer: {
              include: {
                user: { select: { firstName: true; lastName: true } };
              };
            };
            service: { select: { id: true; name: true } };
          };
        };
      };
    };
  };
}>;

/**
 * Zona a la que da acceso un QR (P1-7). En multizona el servicio principal de
 * la reserva miente: un QR de piscina en una compra con cancha debe mostrar
 * piscina. Sin bloque (QR legacy) se usa la reserva.
 */
export function zonaDeAcceso(a: {
  qrToken: {
    block?: { service?: { name?: string } | null } | null;
    reservation: { service: { name: string } };
  };
}): string {
  return a.qrToken.block?.service?.name ?? a.qrToken.reservation.service.name;
}

export type EmployeeRow = Prisma.EmployeeGetPayload<{
  include: {
    user: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        isActive: true;
      };
    };
    assignments: { include: { service: { select: { id: true; name: true } } } };
    _count: { select: { accesses: true } };
  };
}>;

/** Detalle de un empleado: suma createdAt para mostrar el alta en el sistema. */
export type EmployeeDetailRow = Prisma.EmployeeGetPayload<{
  include: {
    user: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        isActive: true;
        createdAt: true;
      };
    };
    assignments: { include: { service: { select: { id: true; name: true } } } };
    _count: { select: { accesses: true } };
  };
}>;

/** Instalaciones agrupadas por categoría, para asignar zonas a un empleado. */
export type ZoneGroup = {
  categoryId: string;
  categoryName: string;
  services: Array<{ id: string; name: string }>;
};

/** Un acceso validado por el empleado, para su historial personal. */
export type EmployeeAccessRow = Prisma.AccessGetPayload<{
  include: {
    qrToken: {
      select: {
        seqNo: true;
        reservation: {
          select: {
            startsAt: true;
            service: { select: { name: true } };
            customer: {
              select: {
                document: true;
                user: { select: { firstName: true; lastName: true } };
              };
            };
          };
        };
      };
    };
  };
}>;

export type CustomerRow = Prisma.CustomerGetPayload<{
  include: {
    user: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        isActive: true;
        createdAt: true;
      };
    };
    _count: { select: { reservations: true } };
  };
}>;

export interface DashboardOverview {
  reservationsByStatus: Record<string, number>;
  totalReservations: number;
  revenueCop: number;
  accessesToday: number;
  accessesAllowedToday: number;
  accessesDeniedToday: number;
  holdsActive: number;
  occupancyToday: { used: number; total: number } | null;
  occupancyByService: Array<{
    serviceId: string;
    serviceName: string;
    used: number;
    total: number;
  }>;
  dailySeries: Array<{ date: string; label: string; total: number; confirmed: number }>;
  recentReservations: ReservationRow[];
  recentAccesses: AccessRow[];
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const RESERVATION_STATUSES = [
  "pending_payment",
  "payment_processing",
  "confirmed",
  "payment_rejected",
  "expired",
  "used",
] as const;

export type ReservationStatusKey = (typeof RESERVATION_STATUSES)[number];
