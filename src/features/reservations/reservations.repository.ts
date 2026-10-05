import type { Prisma } from "@prisma/client";

import { ConflictError } from "@/shared/http/errors";
import { db } from "@/shared/lib/db";

import type { ReservationRow } from "./reservations.types";

/**
 * Relaciones que necesita el payload de reserva. Se declara con `as const` para
 * que Prisma infiera los tipos literales ("asc", "active") sin anotaciones.
 */
const reservationInclude = {
  service: {
    include: {
      category: true,
    },
  },
  slots: {
    include: {
      slot: true,
    },
  },
  // Solo importa el hold vigente: los liberados o consumidos son histórico.
  holds: {
    where: {
      status: "active",
    },
    orderBy: {
      expiresAt: "desc",
    },
    take: 1,
  },
} as const;

export async function findCustomerByUserId(userId: string) {
  return db.customer.findUnique({
    where: { userId },
    select: { id: true },
  });
}

export type ServiceForReservation = {
  id: string;
  name: string;
  price: number;
};

export async function findServiceById(
  serviceId: string,
): Promise<ServiceForReservation | null> {
  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true, price: true },
  });

  return service;
}

export type SlotForReservation = {
  id: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  heldCount: number;
};

export async function findSlotById(slotId: string): Promise<SlotForReservation | null> {
  return db.serviceSlot.findUnique({
    where: { id: slotId },
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

export async function findReservationsByCustomer(
  customerId: string,
): Promise<ReservationRow[]> {
  return db.reservation.findMany({
    where: { customerId },
    include: reservationInclude,
    // Orden por inicio de la franja: aprovecha el índice (customerId, startsAt, endsAt)
    // y es el orden en que el usuario piensa en sus reservas.
    orderBy: {
      startsAt: "asc",
    },
  });
}

export async function findReservationByIdForCustomer(
  id: string,
  customerId: string,
): Promise<ReservationRow | null> {
  // La condición de `customerId` va en el WHERE y no en un filtro posterior:
  // una reserva ajena no debe existir para esta consulta (además no se filtra por
  // rol, así que un admin tampoco ve reservas de otros por este endpoint).
  return db.reservation.findFirst({
    where: { id, customerId },
    include: reservationInclude,
  });
}

export type CreateReservationWithHoldParams = {
  customerId: string;
  serviceId: string;
  slotId: string;
  quantity: number;
  totalCop: number;
  holdExpiresAt: Date;
};

/**
 * Crea la reserva, su `ReservationSlot` y su `ReservationHold`, e incrementa
 * `heldCount` de la franja, todo en una sola transacción.
 *
 * La protección contra sobreventa es el `UPDATE` condicionado: la disponibilidad
 * se comprueba **dentro** de la misma sentencia que incrementa el contador. Con el
 * aislamiento por defecto (READ COMMITTED), Postgres toma un lock de fila y vuelve a
 * evaluar el WHERE sobre la versión actualizada, así que si dos peticiones compiten
 * por los últimos cupos solo una puede satisfacer
 * `capacity - bookedCount - heldCount >= quantity`; la otra actualiza 0 filas y
 * termina en 409. Un `if` en JavaScript después de un SELECT no daría esa garantía.
 *
 * El error se lanza dentro de la transacción a propósito: así el incremento de
 * `heldCount` se revierte junto con la reserva.
 */
export async function createReservationWithHold(
  params: CreateReservationWithHoldParams,
): Promise<ReservationRow> {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const affectedRows = await tx.$executeRaw`
      UPDATE "ServiceSlot"
         SET "heldCount" = "heldCount" + CAST(${params.quantity} AS INTEGER)
       WHERE "id" = CAST(${params.slotId} AS uuid)
         AND "serviceId" = CAST(${params.serviceId} AS uuid)
         AND "capacity" - "bookedCount" - "heldCount" >= CAST(${params.quantity} AS INTEGER)
    `;

    if (affectedRows !== 1) {
      // 0 filas = la franja no existe, no es de este servicio o ya no quedan cupos.
      throw new ConflictError("No hay cupos disponibles para esa franja");
    }

    // Se relee la franja dentro de la transacción para copiar sus horas reales
    // (y no las de una lectura anterior que pudiera quedar desactualizada).
    const slot = await tx.serviceSlot.findUniqueOrThrow({
      where: { id: params.slotId },
      select: { startsAt: true, endsAt: true },
    });

    const reservation = await tx.reservation.create({
      data: {
        customerId: params.customerId,
        serviceId: params.serviceId,
        // `createdBy` se deja null a propósito: el modelo lo reserva para la venta
        // en persona (`channel: in_person`). Una reserva online ya tiene su autor
        // en `customerId`.
        //
        // El estado inicial `pending_payment` más el hold de 10 minutos es lo que
        // deja el cupo bloqueado hasta que el módulo de pagos resuelva el cobro.
        status: "pending_payment",
        channel: "online",
        quantity: params.quantity,
        totalCop: params.totalCop,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      },
      select: { id: true },
    });

    await tx.reservationSlot.create({
      data: {
        reservationId: reservation.id,
        slotId: params.slotId,
        quantity: params.quantity,
      },
    });

    await tx.reservationHold.create({
      data: {
        reservationId: reservation.id,
        status: "active",
        expiresAt: params.holdExpiresAt,
      },
    });

    return tx.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
      include: reservationInclude,
    });
  });
}