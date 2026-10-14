import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  payment: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  reservation: { updateMany: vi.fn() },
}));

vi.mock("@/shared/lib/db", () => ({
  db: { $transaction: (cb: (t: unknown) => unknown) => cb(tx) },
}));

import { rejectPayment } from "../payments.repository";

describe("rejectPayment (P1-2: no voltea succeeded a failed)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    tx.payment.updateMany.mockResolvedValue({ count: 1 });
    tx.payment.findUniqueOrThrow.mockResolvedValue({
      id: "pay-1",
      reservationId: "res-1",
      status: "failed",
    });
    tx.reservation.updateMany.mockResolvedValue({ count: 1 });
  });

  it("solo marca failed si el pago sigue pending", async () => {
    await rejectPayment({ paymentId: "pay-1", reason: "Fondos insuficientes" });

    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay-1", status: "pending" },
      data: { status: "failed" },
    });
  });

  it("si el pago ya es succeeded lo deja intacto y devuelve la fila real", async () => {
    // Carrera perdida contra el webhook de éxito: el update condicional no
    // toca nada (count 0) y la fila sigue diciendo succeeded.
    tx.payment.updateMany.mockResolvedValue({ count: 0 });
    tx.payment.findUniqueOrThrow.mockResolvedValue({
      id: "pay-1",
      reservationId: "res-1",
      status: "succeeded",
    });

    const row = await rejectPayment({ paymentId: "pay-1" });

    expect(row.status).toBe("succeeded");
    expect(tx.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: "res-1", status: "pending_payment" },
      data: { status: "payment_rejected" },
    });
  });
});
