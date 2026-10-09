import type { Prisma } from "@prisma/client";

import { db } from "@/shared/lib/db";

// ---------------------------------------------------------------------------
// Reservas del cliente. Toda la informacion viene de la base: no hay datos de
// ejemplo. El cliente solo ve lo suyo.
// ---------------------------------------------------------------------------

export type CustomerReservation = Prisma.ReservationGetPayload<{
  include: {
    service: { select: { id: true, name: true, slug: true, category: { select: { name: true, slug: true } } } };
    qrTokens: {
      select: { id: true, seqNo: true, status: true, usedAt: true },
      orderBy: { seqNo: "asc" },
    };
    payments: { select: { id: true, status: true, amountCop: true, paidAt: true } };
  };
}>;

const reservationInclude = {
  service: {
    select: {
      id: true,
      name: true,
      slug: true,
      category: { select: { name: true, slug: true } },
    },
  },
  qrTokens: {
    select: { id: true, seqNo: true, status: true, usedAt: true },
    orderBy: { seqNo: "asc" as const },
  },
  payments: { select: { id: true, status: true, amountCop: true, paidAt: true } },
} as const;

/**
 * Reservas del cliente autenticado, de la mas reciente a la mas antigua.
 * Devuelve tambien las que no son suyas si se pasa otro userId, por eso el
 * filtro va siempre por customer.userId.
 */
export async function listCustomerReservations(userId: string): Promise<CustomerReservation[]> {
  const rows = await db.reservation.findMany({
    where: { customer: { userId } },
    orderBy: { startsAt: "desc" },
    include: reservationInclude,
  });
  return rows;
}

/** Detalle de una reserva, verificando que pertenezca al cliente. */
export async function getCustomerReservation(
  userId: string,
  reservationId: string,
): Promise<CustomerReservation | null> {
  const row = await db.reservation.findFirst({
    where: { id: reservationId, customer: { userId } },
    include: reservationInclude,
  });
  return row;
}

/** Reservas cuyo QR sigue vigente: las que el cliente puede presentar. */
export async function countUpcomingReservations(userId: string): Promise<number> {
  return db.reservation.count({
    where: {
      customer: { userId },
      status: "confirmed",
      endsAt: { gte: new Date() },
    },
  });
}

/**
 * Resumen de reservas del cliente para el panel: cuenta por estado.
 * Se usa en las tarjetas del perfil.
 */
export async function getCustomerReservationCounts(userId: string) {
  const grouped = await db.reservation.groupBy({
    by: ["status"],
    where: { customer: { userId } },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {
    pending_payment: 0,
    payment_processing: 0,
    confirmed: 0,
    payment_rejected: 0,
    expired: 0,
    used: 0,
  };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }
  return counts;
}