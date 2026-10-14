import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  recordStripeEvent: vi.fn(),
  getPaymentBySessionId: vi.fn(),
  getPaymentByIntentId: vi.fn(),
  confirmarPagoExitoso: vi.fn(),
  rechazarPago: vi.fn(),
}));

vi.mock("@/shared/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}));
vi.mock("@/features/payments/payments.repository", () => ({
  recordStripeEvent: mocks.recordStripeEvent,
  getPaymentBySessionId: mocks.getPaymentBySessionId,
  getPaymentByIntentId: mocks.getPaymentByIntentId,
}));
vi.mock("@/features/payments/payments.service", () => ({
  confirmarPagoExitoso: mocks.confirmarPagoExitoso,
  rechazarPago: mocks.rechazarPago,
}));

import { POST } from "@/app/api/payments/webhook/route";

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

function eventoCompleted() {
  return {
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_intent: "pi_1" } },
  };
}

function request() {
  return new Request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  }) as never;
}

describe("POST /api/payments/webhook (P1-1: reintento tras crash)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.constructEvent.mockReturnValue(eventoCompleted());
  });

  it("duplicado con pago todavía pendiente termina la liquidación", async () => {
    // El primer intento registró el evento y se cayó antes de liquidar.
    mocks.recordStripeEvent.mockResolvedValue({ applied: false });
    mocks.getPaymentBySessionId.mockResolvedValue({ id: "pay-1", status: "pending" });
    mocks.confirmarPagoExitoso.mockResolvedValue({
      transitioned: true,
      emitidos: [{ token: "t", etiqueta: "Z1-P01" }],
    });

    const res = await POST(request());
    const body = await res.json();

    expect(mocks.confirmarPagoExitoso).toHaveBeenCalledWith({
      paymentId: "pay-1",
      stripePaymentIntentId: "pi_1",
    });
    expect(body.data).toMatchObject({
      received: true,
      duplicate: true,
      recuperado: true,
      qrEmitidos: 1,
    });
  });

  it("duplicado con pago ya liquidado solo acusa recibo", async () => {
    mocks.recordStripeEvent.mockResolvedValue({ applied: false });
    mocks.getPaymentBySessionId.mockResolvedValue({ id: "pay-1", status: "succeeded" });

    const res = await POST(request());
    const body = await res.json();

    expect(mocks.confirmarPagoExitoso).not.toHaveBeenCalled();
    expect(body.data).toMatchObject({ received: true, duplicate: true });
    expect(body.data.recuperado).toBeUndefined();
  });
});
