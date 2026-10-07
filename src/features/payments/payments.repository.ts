import { db } from "@/shared/lib/db";
import type { Prisma } from "@prisma/client";

import type { PaymentWithRelations } from "./payments.types";

export async function createPayment(data: {
  reservationId: string;
  method: "card" | "cash";
  amountCop: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}) {
  return db.payment.create({
    data: {
      reservationId: data.reservationId,
      method: data.method,
      amountCop: data.amountCop,
      status: "pending",
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
    },
  });
}

export async function getPaymentById(id: string): Promise<PaymentWithRelations | null> {
  return db.payment.findUnique({
    where: { id },
    include: {
      reservation: { include: { service: { select: { id: true, name: true } } } },
      stripeEvents: true,
    },
  });
}

export async function getPaymentByReservation(reservationId: string) {
  return db.payment.findFirst({
    where: { reservationId },
    orderBy: { createdAt: "desc" },
    include: {
      reservation: { include: { service: { select: { id: true, name: true } } } },
      stripeEvents: true,
    },
  });
}

export async function updatePaymentStatus(
  paymentId: string,
  status: "succeeded" | "failed",
  paidAt?: Date
) {
  return db.payment.update({
    where: { id: paymentId },
    data: {
      status,
      paidAt: paidAt ?? (status === "succeeded" ? new Date() : undefined),
    },
  });
}

export async function createStripeEvent(eventId: string, data: {
  paymentId?: string;
  type: string;
  payload: unknown;
}) {
  return db.stripeEvent.create({
    data: {
      eventId,
      paymentId: data.paymentId,
      type: data.type,
      payload: data.payload as Prisma.InputJsonValue,
    },
  });
}

export async function stripeEventExists(eventId: string): Promise<boolean> {
  const event = await db.stripeEvent.findUnique({
    where: { eventId },
    select: { eventId: true },
  });
  return !!event;
}

export async function getPaymentByStripeSession(sessionId: string) {
  return db.payment.findUnique({
    where: { stripeSessionId: sessionId },
    include: {
      reservation: { include: { service: { select: { id: true, name: true } } } },
      stripeEvents: true,
    },
  });
}

export async function getPaymentByStripeIntent(intentId: string) {
  return db.payment.findUnique({
    where: { stripePaymentIntentId: intentId },
    include: {
      reservation: { include: { service: { select: { id: true, name: true } } } },
      stripeEvents: true,
    },
  });
}