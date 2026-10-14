import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/db", () => ({ db: {} }));

import { liberarHoldsVencidos } from "../reservations.service";

function clienteCon(vencidas: Array<{ id: string; slots: Array<{ slotId: string; quantity: number }> }>) {
  return {
    reservation: {
      findMany: vi.fn().mockResolvedValue(vencidas),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    reservationHold: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
}

describe("liberarHoldsVencidos (P2-4: lote acotado)", () => {
  it("por defecto pide como máximo 50 vencidas", async () => {
    const cliente = clienteCon([]);

    await liberarHoldsVencidos(new Date(), cliente as never);

    expect(cliente.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it("con null barre sin límite (cron)", async () => {
    const cliente = clienteCon([]);

    await liberarHoldsVencidos(new Date(), cliente as never, null);

    const args = cliente.reservation.findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(args).not.toHaveProperty("take");
  });

  it("devuelve los cupos de la tabla puente y cuenta liberadas", async () => {
    const cliente = clienteCon([
      { id: "res-1", slots: [{ slotId: "slot-1", quantity: 3 }] },
    ]);

    const liberadas = await liberarHoldsVencidos(new Date(), cliente as never);

    expect(liberadas).toBe(1);
    expect(cliente.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "res-1", status: "pending_payment" }),
        data: { status: "expired" },
      }),
    );
    expect(cliente.$executeRaw).toHaveBeenCalledOnce();
  });

  it("avisa por cada reserva que esta pasada expiró", async () => {
    const cliente = clienteCon([
      { id: "res-1", slots: [{ slotId: "slot-1", quantity: 1 }] },
      { id: "res-2", slots: [{ slotId: "slot-2", quantity: 1 }] },
    ]);
    const avisadas: string[] = [];

    const liberadas = await liberarHoldsVencidos(new Date(), cliente as never, 50, (id) => {
      avisadas.push(id);
    });

    expect(liberadas).toBe(2);
    expect(avisadas).toEqual(["res-1", "res-2"]);
  });

  it("no avisa la que ya expiró otra petición (carrera perdida)", async () => {
    const cliente = clienteCon([
      { id: "res-1", slots: [{ slotId: "slot-1", quantity: 1 }] },
    ]);
    cliente.reservation.updateMany.mockResolvedValue({ count: 0 });
    const avisadas: string[] = [];

    const liberadas = await liberarHoldsVencidos(new Date(), cliente as never, 50, (id) => {
      avisadas.push(id);
    });

    expect(liberadas).toBe(0);
    expect(avisadas).toEqual([]);
    expect(cliente.$executeRaw).not.toHaveBeenCalled();
  });
});
