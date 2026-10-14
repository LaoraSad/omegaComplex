import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repository: {
    consumirHoldYTrasladarCupos: vi.fn(),
    createPendingPayment: vi.fn(),
    liberarCuposDeReserva: vi.fn(),
    rejectPayment: vi.fn(),
    settlePayment: vi.fn(),
    obtenerContactoAviso: vi.fn(),
  },
  qr: {
    emitirQrDeReserva: vi.fn(),
  },
  sendQrEmail: vi.fn(),
  sendPagoRechazadoEmail: vi.fn(),
  enviarEvento: vi.fn(),
  db: {
    reservation: { findUnique: vi.fn() },
    reservationHold: { findFirst: vi.fn() },
    payment: { update: vi.fn(), findFirst: vi.fn() },
  },
  createSession: vi.fn(),
}));

vi.mock("../payments.repository", () => mocks.repository);
vi.mock("@/features/reservations/qr", () => mocks.qr);
vi.mock("@/shared/lib/db", () => ({ db: mocks.db }));
// El envío de correo vive ahora en este servicio. `@/lib/email/resend` es
// server-only y revienta si se importa sin mock; acá solo interesa comprobar
// que se intente entregar.
vi.mock("@/lib/email/resend", () => ({
  sendQrEmail: mocks.sendQrEmail,
  sendPagoRechazadoEmail: mocks.sendPagoRechazadoEmail,
}));
vi.mock("@/shared/integrations/n8n", () => ({
  enviarEvento: mocks.enviarEvento,
  n8nConfigurado: () => false,
}));
vi.mock("@/shared/pdf/qr-pdf", () => ({ generarPdfQr: async () => new Uint8Array() }));

import { ConflictError, NotFoundError } from "@/shared/http/errors";
import {
  aCentimos,
  confirmarPagoExitoso,
  createCheckoutSession,
  rechazarPago,
} from "../payments.service";

const reservaBase = {
  id: "res-1",
  status: "pending_payment",
  totalCop: 24000,
  quantity: 2,
  startsAt: new Date("2026-11-01T13:00:00Z"),
  endsAt: new Date("2026-11-01T14:00:00Z"),
  service: { name: "Piscina adultos 1" },
  // El checkout ahora arma una línea por zona y nombra a las personas, así que
  // la reserva que devuelve el mock tiene que traer esas relaciones.
  blocks: [
    {
      startsAt: new Date("2026-11-01T13:00:00Z"),
      endsAt: new Date("2026-11-01T14:00:00Z"),
      personas: 2,
      service: { name: "Piscina adultos 1", category: { name: "Piscinas" } },
      guests: [{ guest: { fullName: "Titular" } }, { guest: { fullName: "Ana" } }],
    },
  ],
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

  it("envía el monto en centavos, que es la unidad que espera Stripe", async () => {
    // Regresión: mandar pesos hacía que Stripe leyera 100.000 como $1.000,00 COP
    // y lo rechazara con `amount_too_small`.
    mocks.db.reservation.findUnique.mockResolvedValue({ ...reservaBase, totalCop: 100000 });
    const { stripe, create } = stripeFake();

    await createCheckoutSession({ ...inputBase, amountCop: 100000 }, stripe);

    const args = create.mock.calls[0][0];
    expect(args.line_items[0].price_data.unit_amount).toBe(10000000);
  });

  it("mantiene el guardado en pesos aunque Stripe reciba centavos", async () => {
    mocks.db.reservation.findUnique.mockResolvedValue({ ...reservaBase, totalCop: 148000 });
    const { stripe } = stripeFake();

    await createCheckoutSession({ ...inputBase, amountCop: 148000 }, stripe);

    expect(mocks.repository.createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountCop: 148000 }),
    );
  });
    it("crea la sesión de Stripe con el total real y guarda el pago pendiente", async () => {
    const { stripe, create } = stripeFake();
    const result = await createCheckoutSession(inputBase, stripe);

    expect(create).toHaveBeenCalledOnce();
    const args = create.mock.calls[0][0];
    expect(args.currency).toBe("cop");
    // Stripe recibe centavos, no pesos: 24.000 COP van como 2.400.000.
    expect(args.line_items[0].price_data.unit_amount).toBe(2400000);
    expect(mocks.repository.createPendingPayment).toHaveBeenCalledWith({
      reservationId: "res-1",
      // El pago se guarda en pesos, que es como trabaja el resto del sistema.
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
    // Caso base: pago pendiente, reserva pendiente y hold vigente.
    mocks.db.payment.findFirst.mockResolvedValue({
      id: "pay-1",
      reservationId: "res-1",
      status: "pending",
    });
    mocks.db.reservation.findUnique.mockResolvedValue({
      id: "res-1",
      status: "pending_payment",
    });
    mocks.db.reservationHold.findFirst.mockResolvedValue({ id: "hold-1" });
  });

  it("liquida, traslada cupos y emite QR una sola vez", async () => {
    // Primera lectura (pre-chequeo): pendiente. Segunda (post-liquidación):
    // confirmed. Así se cierra la carrera del hold que expira en el medio.
    mocks.db.reservation.findUnique
      .mockResolvedValueOnce({ id: "res-1", status: "pending_payment" })
      .mockResolvedValue({ id: "res-1", status: "confirmed" });
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
    mocks.db.payment.findFirst.mockResolvedValue({
      id: "pay-1",
      reservationId: "res-1",
      status: "succeeded",
    });
    mocks.repository.settlePayment.mockResolvedValue({
      payment: { id: "pay-1", reservationId: "res-1" },
      transitioned: false,
    });

    const result = await confirmarPagoExitoso({
      paymentId: "pay-1",
      stripePaymentIntentId: "pi_1",
    });

    expect(result).toEqual({ transitioned: false, emitidos: [] });
    expect(mocks.repository.settlePayment).not.toHaveBeenCalled();
    expect(mocks.repository.consumirHoldYTrasladarCupos).not.toHaveBeenCalled();
    expect(mocks.qr.emitirQrDeReserva).not.toHaveBeenCalled();
  });

  it("P0-3: reserva expirada no se liquida ni emite QRs", async () => {
    mocks.db.reservation.findUnique.mockResolvedValue({ id: "res-1", status: "expired" });

    await expect(
      confirmarPagoExitoso({ paymentId: "pay-1", stripePaymentIntentId: "pi_1" }),
    ).rejects.toMatchObject({ code: "PAGO_TARDIO_REQUIERE_REVISION" });

    expect(mocks.repository.settlePayment).not.toHaveBeenCalled();
    expect(mocks.repository.consumirHoldYTrasladarCupos).not.toHaveBeenCalled();
    expect(mocks.qr.emitirQrDeReserva).not.toHaveBeenCalled();
  });

  it("P0-3: sin hold vigente no se liquida ni emite QRs", async () => {
    mocks.db.reservationHold.findFirst.mockResolvedValue(null);

    await expect(
      confirmarPagoExitoso({ paymentId: "pay-1", stripePaymentIntentId: "pi_1" }),
    ).rejects.toMatchObject({ code: "PAGO_TARDIO_REQUIERE_REVISION" });

    expect(mocks.repository.settlePayment).not.toHaveBeenCalled();
    expect(mocks.qr.emitirQrDeReserva).not.toHaveBeenCalled();
  });

  it("P0-3: si la reserva no quedó confirmed tras liquidar, no emite QRs", async () => {
    // El hold expiró entre la verificación y la liquidación (carrera).
    mocks.db.reservation.findUnique
      .mockResolvedValueOnce({ id: "res-1", status: "pending_payment" })
      .mockResolvedValue({ id: "res-1", status: "expired" });
    mocks.repository.settlePayment.mockResolvedValue({
      payment: { id: "pay-1", reservationId: "res-1" },
      transitioned: true,
    });

    await expect(
      confirmarPagoExitoso({ paymentId: "pay-1", stripePaymentIntentId: "pi_1" }),
    ).rejects.toMatchObject({ code: "PAGO_TARDIO_REQUIERE_REVISION" });

    expect(mocks.qr.emitirQrDeReserva).not.toHaveBeenCalled();
  });
});

describe("aCentimos (P0-2: puente pesos -> Stripe, comportamiento congelado)", () => {
  it("100.000 COP viajan como 10.000.000", () => {
    expect(aCentimos(100000)).toBe(10000000);
  });

  it("24.000 COP viajan como 2.400.000", () => {
    expect(aCentimos(24000)).toBe(2400000);
  });

  it("redondea fracciones a la unidad mínima entera", () => {
    expect(aCentimos(100.5)).toBe(10050);
  });

  // NOTA para el responsable de Stripe: si COP fuera cero-decimal en la
  // cuenta, este ×100 cobraría 100x. No cambiar sin pago de prueba en test
  // mode que confirme que el checkout muestra lo mismo que la app.
});

describe("rechazarPago", () => {  it("marca fallido y libera los cupos retenidos", async () => {
    mocks.repository.rejectPayment.mockResolvedValue({ id: "pay-1", reservationId: "res-1" });
    mocks.repository.liberarCuposDeReserva.mockResolvedValue({ applied: true });
    mocks.repository.obtenerContactoAviso.mockResolvedValue(null);

    await rechazarPago({ paymentId: "pay-1", reason: "Fondos insuficientes" });

    expect(mocks.repository.rejectPayment).toHaveBeenCalledWith({
      paymentId: "pay-1",
      reason: "Fondos insuficientes",
    });
    expect(mocks.repository.liberarCuposDeReserva).toHaveBeenCalledWith("res-1");
  });

  it("avisa al cliente por correo con el motivo (Fase 3.1)", async () => {
    mocks.repository.rejectPayment.mockResolvedValue({ id: "pay-1", reservationId: "res-1" });
    mocks.repository.liberarCuposDeReserva.mockResolvedValue({ applied: true });
    mocks.repository.obtenerContactoAviso.mockResolvedValue({
      email: "cliente@ejemplo.com",
      nombre: "Ana López",
      startsAt: new Date("2026-11-01T13:00:00Z"),
      servicio: "Piscina adultos 1",
      totalCop: 24000,
    });

    await rechazarPago({ paymentId: "pay-1", reason: "Fondos insuficientes" });

    expect(mocks.sendPagoRechazadoEmail).toHaveBeenCalledWith(
      "cliente@ejemplo.com",
      expect.objectContaining({
        nombre: "Ana López",
        servicio: "Piscina adultos 1",
        montoCop: 24000,
        motivo: "Fondos insuficientes",
      }),
    );
  });

  it("no tumba el rechazo si el correo falla o no hay contacto", async () => {
    mocks.repository.rejectPayment.mockResolvedValue({ id: "pay-1", reservationId: "res-1" });
    mocks.repository.liberarCuposDeReserva.mockResolvedValue({ applied: true });
    mocks.sendPagoRechazadoEmail.mockClear();

    mocks.repository.obtenerContactoAviso.mockResolvedValue(null);
    await expect(rechazarPago({ paymentId: "pay-1" })).resolves.toMatchObject({ id: "pay-1" });
    expect(mocks.sendPagoRechazadoEmail).not.toHaveBeenCalled();

    mocks.repository.obtenerContactoAviso.mockResolvedValue({
      email: "cliente@ejemplo.com",
      nombre: "Ana López",
      startsAt: new Date("2026-11-01T13:00:00Z"),
      servicio: "Piscina adultos 1",
      totalCop: 24000,
    });
    mocks.sendPagoRechazadoEmail.mockRejectedValue(new Error("Resend caído"));
    await expect(rechazarPago({ paymentId: "pay-1" })).resolves.toMatchObject({ id: "pay-1" });
  });
});
