import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn().mockResolvedValue(1),
  $queryRaw: vi.fn().mockResolvedValue([]),
  customer: { findUnique: vi.fn() },
  reservation: {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({ id: "res-1" }),
  },
  reservationHold: {
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    findFirstOrThrow: vi.fn().mockResolvedValue({ id: "hold-1" }),
  },
  reservationBlock: {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  },
  reservationBlockGuest: { createMany: vi.fn() },
  reservationGuest: { create: vi.fn().mockResolvedValue({ id: "g-1" }) },
}));
const dbMock = vi.hoisted(() => ({
  serviceSlot: { findMany: vi.fn() },
  serviceClosure: { findMany: vi.fn().mockResolvedValue([]) },
  reservation: { findMany: vi.fn() },
  $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)),
}));

vi.mock("@/shared/lib/db", () => ({ db: dbMock }));

import { createReservationWithHold } from "../reservations.service";

// Martes 2026-10-20 08:00-09:00 Bogotá. Sábado 2026-10-10 como "ahora".
const SLOT = {
  id: "22222222-2222-4222-8222-222222222222",
  serviceId: "11111111-1111-4111-8111-111111111111",
  startsAt: new Date("2026-10-20T13:00:00.000Z"),
  endsAt: new Date("2026-10-20T14:00:00.000Z"),
  capacity: 10,
  bookedCount: 0,
  heldCount: 0,
  service: {
    name: "Cancha 1",
    price: 24000,
    category: { name: "Canchas" },
    serviceSchedules: [{ dayOfWeek: 2, openTime: "08:00", closeTime: "17:00" }],
  },
};
const AHORA = new Date("2026-10-10T15:00:00.000Z");

function input() {
  return {
    personas: 1,
    acompañantes: [],
    bloques: [
      {
        serviceId: SLOT.serviceId,
        slotId: SLOT.id,
        fecha: "2026-10-20",
        personas: 1,
      },
    ],
  };
}

describe("limpieza de holds dentro de la tx (P2-2)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.$transaction.mockImplementation((cb: (t: unknown) => unknown) => cb(tx));
    dbMock.serviceSlot.findMany.mockResolvedValue([SLOT]);
    dbMock.serviceClosure.findMany.mockResolvedValue([]);
    tx.$executeRaw.mockResolvedValue(1);
    tx.$queryRaw.mockResolvedValue([]);
    tx.customer.findUnique.mockResolvedValue({
      id: "cust-1",
      document: "123",
      user: { firstName: "A", lastName: "B" },
    });
    tx.reservation.findMany.mockResolvedValue([]);
    tx.reservation.create.mockResolvedValue({ id: "res-1" });
    tx.reservationBlock.findFirst.mockResolvedValue(null);
    tx.reservationBlock.findMany.mockResolvedValue([]);
    tx.reservationHold.findFirstOrThrow.mockResolvedValue({ id: "hold-1" });
    tx.reservationGuest.create.mockResolvedValue({ id: "g-1" });
  });

  it("crea la reserva y limpia vencidos con el cliente de la tx", async () => {
    const r = await createReservationWithHold("user-1", input(), AHORA);

    expect(r).toMatchObject({ ok: true, reservationId: "res-1" });
    // La limpieza corre dentro de la transacción…
    expect(tx.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending_payment" }),
      }),
    );
    // …y no por fuera con el cliente global.
    expect(dbMock.reservation.findMany).not.toHaveBeenCalled();
    // El chequeo de solape también usa la tx (después del lock).
    expect(tx.reservationBlock.findFirst).toHaveBeenCalled();
  });
});
