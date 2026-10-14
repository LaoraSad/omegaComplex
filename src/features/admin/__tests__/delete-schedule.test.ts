import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  serviceSlot: { deleteMany: vi.fn() },
  serviceSchedule: { delete: vi.fn() },
}));
const dbMock = vi.hoisted(() => ({
  serviceSchedule: { findUnique: vi.fn() },
  serviceSlot: { findMany: vi.fn() },
  $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)),
}));

vi.mock("@/shared/lib/db", () => ({ db: dbMock }));

import { deleteServiceSchedule } from "../admin.repository";

// Lunes 2026-10-19 08:00 Bogotá y martes 2026-10-20 08:00 Bogotá.
const LUNES = new Date("2026-10-19T13:00:00.000Z");
const MARTES = new Date("2026-10-20T13:00:00.000Z");

describe("deleteServiceSchedule (P1-8: día en Bogotá + transacción)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.$transaction.mockImplementation((cb: (t: unknown) => unknown) => cb(tx));
    dbMock.serviceSchedule.findUnique.mockResolvedValue({ id: "sch-1" });
    dbMock.serviceSlot.findMany.mockResolvedValue([
      { id: "slot-lun", startsAt: LUNES },
      { id: "slot-mar", startsAt: MARTES },
    ]);
    tx.serviceSlot.deleteMany.mockResolvedValue({ count: 1 });
    tx.serviceSchedule.delete.mockResolvedValue({ id: "sch-1" });
  });

  it("borra solo los slots del día pedido, calculado en Bogotá", async () => {
    await deleteServiceSchedule("svc-1", 1);

    expect(tx.serviceSlot.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["slot-lun"] } },
    });
    expect(tx.serviceSchedule.delete).toHaveBeenCalledWith({
      where: { serviceId_dayOfWeek: { serviceId: "svc-1", dayOfWeek: 1 } },
    });
  });

  it("borra slots y horario dentro de una transacción", async () => {
    await deleteServiceSchedule("svc-1", 1);

    expect(dbMock.$transaction).toHaveBeenCalledOnce();
  });

  it("si el horario no existe no toca nada", async () => {
    dbMock.serviceSchedule.findUnique.mockResolvedValue(null);

    await expect(deleteServiceSchedule("svc-1", 1)).rejects.toThrow();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});
