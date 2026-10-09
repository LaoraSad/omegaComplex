import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repository: {
    consumirHoldYTrasladarCupos: vi.fn(),
    createPendingPayment: vi.fn(),
    liberarCuposDeReserva: vi.fn(),
    rejectPayment: vi.fn(),
    settlePayment: vi.fn(),
  },
  qr: {
    emitirQrDeReserva: vi.fn(),
  },
  db: {
    reservation: { findUnique: vi.fn() },
    reservationHold: { findFirst: vi.fn() },
    payment: { update: vi.fn() },
  },
  createSession: vi.fn(),
}));

vi.mock("../payments.repository", () => mocks.repository);
vi.mock("@/features/reservations/qr", () => mocks.qr);
vi.mock("@/shared/lib/db", () => ({ db: mocks.db }));

import { ConflictError, NotFoundError } from "@/shared/http/errors";
import {
  confirmarPagoExitoso,
  createCheckoutSession,
  rechazarPago,
} from "../payments.service";

const reservaBase = {
  id: "res-1",
  status: "pending_payment",
  totalCop: 24000,
  startsAt: new Date("2026-11-01T13:00:00Z"),
  endsAt: new Date("2026-11-01T14:00:00Z"),
  service: { name: "Piscina adultos 1" },
};

const inputBase = {
  reservationId: "res-1",
  amountCop: 24000,
  method: "card" as const,
  successUrl: "http://localhost:3000/mis-reservas?reserva=res-1&pago=exitoso",
  cancelUrl: "http://localhost:3000/mis-reservas?reserva=res-1&pago=cancelado",
};

function stripeFake(session: Record<string, unknown> = {}) {
  const create = vi.fn().mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/pay/cs_test_1",
    payment_intent: "pi_test_1",
    ...session,
  });
  return {
    stripe: { checkout: { sessions: { create } } } as never,
    create,
  };
}

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.reservation.findUnique.mockResolvedValue(reservaBase);
    mocks.db.reservationHold.findFirst.mockResolvedValue({ id: "hold-1" });
    mocks.repository.createPendingPayment.mockResolvedValue({ id: "pay-1" });
    mocks.db.payment.update.mockResolvedValue({});
  });

  it("crea la sesión de Stripe con el total real y guarda el pago pendiente", async () => {
    const { stripe, create } = stripeFake();
    const result = await createCheckoutSession(inputBase, stripe);

    expect(create).toHaveBeenCalledOnce();
    const args = create.mock.calls[0][0];
    expect(args.currency).toBe("cop");
    expect(args.line_items[0].price_data.unit_amount).toBe(24000);
    expect(mocks.repository.createPendingPayment).toHaveBeenCalledWith({
      reservationId: "res-1",
      amountCop: 24000,
      stripeSessionId: "cs_test_1",
      method: "card",
    });
    expect(result).toEqual({
      sessionId: "cs_test_1",
      checkoutUrl: "https://checkout.stripe.com/pay/cs_test_1",
      paymentId: "pay-1",
    });
  });

  it("rechaza monto manipulado aunque la reserva exista", async () => {
    await expect(
      createCheckoutSession({ ...inputBase, amountCop: 1 }, stripeFake().stripe),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.repository.createPendingPayment).not.toHaveBeenCalled();
  });

  it("lanza 404 si la reserva no existe y 409 si no está pendiente o sin hold", async () => {
    mocks.db.reservation.findUnique.mockResolvedValue(null);
    await expect(createCheckoutSession(inputBase, stripeFake().stripe)).rejects.toBeInstanceOf(
      NotFoundError,
    );

    mocks.db.reservation.findUnique.mockResolvedValue({ ...reservaBase, status: "confirmed" });
    await expect(createCheckoutSession(inputBase, stripeFake().stripe)).rejects.toBeInstanceOf(
      ConflictError,
    );

    mocks.db.reservation.findUnique.mockResolvedValue(reservaBase);
    mocks.db.reservationHold.findFirst.mockResolvedValue(null);
    await expect(createCheckoutSession(inputBase, stripeFake().stripe)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe("confirmarPagoExitoso", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("liquida, traslada cupos y emite QR una sola vez", async () => {
    mocks.repository.settlePayment.mockResolvedValue({
      payment: { id: "pay-1", reservationId: "res-1" },
      transitioned: true,
    });
    mocks.repository.consumirHoldYTrasladarCupos.mockResolvedValue({ applied: true });
    const emitidos = [{ token: "t", etiqueta: "Z1-P01" }];
    mocks.qr.emitirQrDeReserva.mockResolvedValue({ ok: true, emitidos });

    const result = await confirmarPagoExitoso({
      paymentId: "pay-1",
      stripePaymentIntentId: "pi_1",
    });

    expect(mocks.repository.consumirHoldYTrasladarCupos).toHaveBeenCalledWith("res-1");
    expect(mocks.qr.emitirQrDeReserva).toHaveBeenCalledWith("res-1");
    expect(result).toEqual({ transitioned: true, emitidos });
  });

  it("si el pago ya estaba liquidado no toca cupos ni QR", async () => {
    mocks.repository.settlePayment.mockResolvedValue({
      payment: { id: "pay-1", reservationId: "res-1" },
      transitioned: false,
    });

    const result = await confirmarPagoExitoso({
      paymentId: "pay-1",
      stripePaymentIntentId: "pi_1",
    });

    expect(result).toEqual({ transitioned: false, emitidos: [] });
    expect(mocks.repository.consumirHoldYTrasladarCupos).not.toHaveBeenCalled();
    expect(mocks.qr.emitirQrDeReserva).not.toHaveBeenCalled();
  });
});

describe("rechazarPago", () => {
  it("marca fallido y libera los cupos retenidos", async () => {
    mocks.repository.rejectPayment.mockResolvedValue({ id: "pay-1", reservationId: "res-1" });
    mocks.repository.liberarCuposDeReserva.mockResolvedValue({ applied: true });

    await rechazarPago({ paymentId: "pay-1", reason: "Fondos insuficientes" });

    expect(mocks.repository.rejectPayment).toHaveBeenCalledWith({
      paymentId: "pay-1",
      reason: "Fondos insuficientes",
    });
    expect(mocks.repository.liberarCuposDeReserva).toHaveBeenCalledWith("res-1");
  });
});
