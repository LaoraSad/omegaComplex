import type { Prisma } from "@prisma/client";

export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    reservation: { include: { service: { select: { id: true; name: true } } } };
    stripeEvents: true;
  };
}>;

export interface StripeCheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  paymentId: string;
}