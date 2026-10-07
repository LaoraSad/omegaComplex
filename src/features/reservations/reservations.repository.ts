import { db } from "@/shared/lib/db";
import type { Prisma } from "@prisma/client";

import type {
  AvailabilitySlot,
  DayAvailability,
  CreateReservationResult,
  ReservationWithRelations,
  ServiceSlotWithAvailability,
} from "./reservations.types";

const HOLD_DURATION_MINUTES = 10;
const COLOMBIA_TIMEZONE = "America/Bogota";

type ReservationStatus = "pending_payment" | "payment_processing" | "confirmed" | "payment_rejected" | "expired" | "used";

function toBogotaDate(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return new Date(
    Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    )
  );
}

function bogotaDayRange(ref: Date = new Date()): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TIMEZONE,
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

export async function getAvailabilityForServiceAndDate(
  serviceId: string,
  dateString: string
): Promise<DayAvailability> {
  // Parse dateString as Colombia time (00:00 Bogota = 05:00 UTC)
  const date = new Date(`${dateString}T05:00:00Z`);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 1) {
    return {
      date: dateString,
      isMaintenanceDay: true,
      maintenanceReason: "Complejo cerrado los lunes por mantenimiento general.",
      slots: [],
    };
  }

  // Resolve service ID (handles mock IDs like "piscina-infantil")
  const service = await findServiceById(serviceId);
  if (!service) {
    return {
      date: dateString,
      isMaintenanceDay: false,
      slots: [],
    };
  }

  const { start, end } = bogotaDayRange(date);

  const slots = await db.serviceSlot.findMany({
    where: {
      serviceId: service.id,
      startsAt: { gte: start, lt: end },
    },
    include: {
      service: { select: { id: true, name: true, capacity: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const availabilitySlots: AvailabilitySlot[] = slots.map((slot) => ({
    slotId: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    heldCount: slot.heldCount,
    availableCapacity: Math.max(0, slot.capacity - slot.bookedCount - slot.heldCount),
  }));

  return {
    date: dateString,
    isMaintenanceDay: false,
    slots: availabilitySlots,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function findServiceById(serviceId: string) {
  // If it looks like a UUID, try UUID lookup first
  if (UUID_REGEX.test(serviceId)) {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { category: { select: { name: true } } },
    });
    if (service) return service;
  }

  // Fallback: try by slug (for mock data compatibility)
  const bySlug = await db.service.findUnique({
    where: { slug: serviceId },
    include: { category: { select: { name: true } } },
  });
  if (bySlug) return bySlug;

  // Fallback: try by name (case-insensitive, for mock data compatibility)
  const byName = await db.service.findFirst({
    where: {
      name: { equals: serviceId, mode: "insensitive" },
    },
    include: { category: { select: { name: true } } },
  });
  if (byName) return byName;

  return null;
}

export async function createReservationWithHold(
  customerId: string,
  data: {
    serviceId: string;
    startsAt: Date;
    endsAt: Date;
    quantity: number;
    channel: "online" | "in_person";
    createdBy?: string;
  }
): Promise<CreateReservationResult> {
  const service = await findServiceById(data.serviceId);

  if (!service) {
    throw new Error("Servicio no encontrado");
  }

  const totalCop = service.price * data.quantity;

  const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

  const result = await db.$transaction(async (tx) => {
    const slots = await tx.serviceSlot.findMany({
      where: {
        serviceId: data.serviceId,
        startsAt: { gte: data.startsAt, lt: data.endsAt },
      },
    });

    for (const slot of slots) {
      const available = slot.capacity - slot.bookedCount - slot.heldCount;
      if (available < data.quantity) {
        throw new Error(`Cupos insuficientes en la franja ${slot.startsAt.toISOString()}`);
      }
    }

    for (const slot of slots) {
      await tx.serviceSlot.update({
        where: { id: slot.id },
        data: { heldCount: { increment: data.quantity } },
      });
    }

    const reservation = await tx.reservation.create({
      data: {
        customerId,
        serviceId: data.serviceId,
        createdBy: data.createdBy,
        status: "pending_payment",
        channel: data.channel,
        quantity: data.quantity,
        totalCop,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        slots: {
          create: slots.map((slot) => ({
            slotId: slot.id,
            quantity: data.quantity,
          })),
        },
        holds: {
          create: {
            status: "active",
            expiresAt: holdExpiresAt,
          },
        },
      },
      include: {
        holds: { where: { status: "active" } },
        slots: { include: { slot: true } },
      },
    });

    const hold = reservation.holds[0];
    if (!hold) {
      throw new Error("No se pudo crear el bloqueo temporal");
    }

    return {
      reservationId: reservation.id,
      holdId: hold.id,
      holdExpiresAt: hold.expiresAt,
      stripeCheckoutUrl: null,
      totalCop,
    };
  });

  return result;
}

export async function getReservationById(id: string): Promise<ReservationWithRelations | null> {
  return db.reservation.findUnique({
    where: { id },
    include: {
      customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      service: { include: { category: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      holds: { where: { status: "active" } },
      qrTokens: { orderBy: { seqNo: "asc" } },
      slots: { include: { slot: true } },
    },
  });
}

export async function getReservationsByCustomer(customerId: string) {
  return db.reservation.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      service: { include: { category: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      qrTokens: { orderBy: { seqNo: "asc" } },
    },
  });
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  paymentId?: string
) {
  return db.$transaction(async (tx) => {
    const reservation = await tx.reservation.update({
      where: { id: reservationId },
      data: { 
        status,
        ...(status === "confirmed" && { 
          confirmedAt: new Date(),
          paidAt: new Date(),
        }),
      },
      include: { slots: { include: { slot: true } }, holds: { where: { status: "active" } } },
    });

    if (status === "confirmed") {
      for (const rs of reservation.slots) {
        await tx.serviceSlot.update({
          where: { id: rs.slot.id },
          data: {
            bookedCount: { increment: reservation.quantity },
            heldCount: { decrement: reservation.quantity },
          },
        });
      }

      for (const hold of reservation.holds) {
        await tx.reservationHold.update({
          where: { id: hold.id },
          data: { status: "consumed" },
        });
      }
    }

    if (status === "payment_rejected" || status === "expired") {
      for (const rs of reservation.slots) {
        await tx.serviceSlot.update({
          where: { id: rs.slot.id },
          data: { heldCount: { decrement: reservation.quantity } },
        });
      }

      for (const hold of reservation.holds) {
        await tx.reservationHold.update({
          where: { id: hold.id },
          data: { status: "released" },
        });
      }
    }

    if (paymentId) {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: status === "confirmed" ? "succeeded" : "failed" },
      });
    }

    return reservation;
  });
}

export async function releaseExpiredHolds() {
  const expiredHolds = await db.reservationHold.findMany({
    where: {
      status: "active",
      expiresAt: { lt: new Date() },
    },
    include: {
      reservation: {
        include: { slots: { include: { slot: true } } },
      },
    },
  });

  for (const hold of expiredHolds) {
    await db.$transaction(async (tx) => {
      for (const rs of hold.reservation.slots) {
        await tx.serviceSlot.update({
          where: { id: rs.slot.id },
          data: { heldCount: { decrement: hold.reservation.quantity } },
        });
      }

      await tx.reservationHold.update({
        where: { id: hold.id },
        data: { status: "released" },
      });

      await tx.reservation.update({
        where: { id: hold.reservationId },
        data: { status: "expired" },
      });
    });
  }

  return expiredHolds.length;
}

export async function createQrTokens(
  reservationId: string,
  quantity: number
): Promise<Array<{ id: string; tokenHash: string; seqNo: number }>> {
  const tokens = await db.$transaction(async (tx) => {
    const existing = await tx.qrToken.findMany({
      where: { reservationId },
      orderBy: { seqNo: "desc" },
      take: 1,
    });
    const nextSeqNo = (existing[0]?.seqNo ?? 0) + 1;

    const created = [];
    for (let i = 0; i < quantity; i++) {
      const token = await tx.qrToken.create({
        data: {
          reservationId,
          tokenHash: `qr_${reservationId}_${nextSeqNo + i}_${Date.now()}`,
          seqNo: nextSeqNo + i,
          status: "active",
        },
      });
      created.push(token);
    }
    return created;
  });

  return tokens;
}