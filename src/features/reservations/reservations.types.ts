import type { Prisma } from "@prisma/client";

export type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: {
    customer: { include: { user: { select: { firstName: true; lastName: true; email: true } } } };
    service: { include: { category: { select: { name: true } } } };
    payments: { orderBy: { createdAt: "desc" } };
    holds: { where: { status: "active" } };
    qrTokens: { orderBy: { seqNo: "asc" } };
    slots: { include: { slot: true } };
  };
}>;

export type ServiceSlotWithAvailability = Prisma.ServiceSlotGetPayload<{
  include: {
    service: { select: { id: true; name: true; capacity: true } };
  };
}>;

export interface AvailabilitySlot {
  slotId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  heldCount: number;
  availableCapacity: number;
}

export interface DayAvailability {
  date: string;
  isMaintenanceDay: boolean;
  maintenanceReason?: string;
  slots: AvailabilitySlot[];
}

export interface CreateReservationResult {
  reservationId: string;
  holdId: string;
  holdExpiresAt: Date;
  stripeCheckoutUrl: string | null;
  totalCop: number;
}