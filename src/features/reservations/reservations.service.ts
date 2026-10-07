import { createSession } from "@/shared/auth/session";

import { createReservationWithHold, findServiceById, getAvailabilityForServiceAndDate, getReservationById, getReservationsByCustomer, updateReservationStatus, createQrTokens, releaseExpiredHolds } from "./reservations.repository";
import { createCheckoutSession } from "@/features/payments/payments.service";
import { HttpError, NotFoundError } from "@/shared/http/errors";

import type { CreateReservationInput } from "./reservations.schemas";
import type { CreateReservationResult } from "./reservations.types";

export async function getAvailability(serviceId: string, date: string) {
  const service = await findServiceById(serviceId);
  if (!service) {
    throw new NotFoundError("Servicio no encontrado");
  }
  return getAvailabilityForServiceAndDate(serviceId, date);
}

export async function createReservation(
  userId: string,
  customerId: string,
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  const service = await findServiceById(input.serviceId);
  if (!service) {
    throw new NotFoundError("Servicio no encontrado");
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (endsAt <= startsAt) {
    throw new HttpError(400, "INVALID_DATE_RANGE", "La fecha de fin debe ser posterior a la de inicio");
  }

  // Validate date is not in the past (using Colombia timezone)
  const nowBogota = new Date();
  const nowBogotaStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(nowBogota);
  const nowMap = Object.fromEntries(nowBogotaStr.map((p) => [p.type, p.value]));
  const nowBogotaDate = new Date(Date.UTC(
    Number(nowMap.year),
    Number(nowMap.month) - 1,
    Number(nowMap.day),
    Number(nowMap.hour),
    Number(nowMap.minute)
  ));
  
  if (startsAt < nowBogotaDate) {
    throw new HttpError(400, "INVALID_DATE", "No se puede reservar en el pasado");
  }

  // Validate not Monday (0=Sunday, 1=Monday in getDay)
  const dayOfWeek = startsAt.getDay();
  if (dayOfWeek === 1) {
    throw new HttpError(400, "INVALID_DATE", "Los lunes no hay servicio por mantenimiento");
  }

  // Validate not more than 3 months ahead
  const threeMonthsLater = new Date(nowBogotaDate);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  if (startsAt > threeMonthsLater) {
    throw new HttpError(400, "INVALID_DATE", "No se puede reservar con más de 3 meses de anticipación");
  }

  const diffHours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
  if (diffHours < 1 || diffHours > 8 || !Number.isInteger(diffHours)) {
    throw new HttpError(400, "INVALID_DURATION", "La duración debe ser entre 1 y 8 horas enteras");
  }

  const result = await createReservationWithHold(customerId, {
    serviceId: input.serviceId,
    startsAt,
    endsAt,
    quantity: input.quantity,
    channel: input.channel,
    createdBy: input.channel === "in_person" ? userId : undefined,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const successUrl = `${baseUrl}/pago/exito?reservation_id=${result.reservationId}`;
  const cancelUrl = `${baseUrl}/servicios/${input.serviceId}?payment_cancelled=1`;

  const paymentResult = await createCheckoutSession({
    reservationId: result.reservationId,
    amountCop: result.totalCop,
    method: "card",
    successUrl,
    cancelUrl,
  });

  return {
    ...result,
    stripeCheckoutUrl: paymentResult.checkoutUrl,
  };
}

export async function confirmReservationAndGenerateQrs(reservationId: string, paymentId: string) {
  const reservation = await updateReservationStatus(reservationId, "confirmed", paymentId);

  if (!reservation) {
    throw new NotFoundError("Reserva no encontrada");
  }

  await createQrTokens(reservationId, reservation.quantity);

  return getReservationById(reservationId);
}

export async function rejectReservation(reservationId: string, paymentId: string) {
  return updateReservationStatus(reservationId, "payment_rejected", paymentId);
}

export async function expireReservation(reservationId: string) {
  return updateReservationStatus(reservationId, "expired");
}

export async function getMyReservations(customerId: string) {
  return getReservationsByCustomer(customerId);
}

export async function getReservationDetail(reservationId: string) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw new NotFoundError("Reserva no encontrada");
  }
  return reservation;
}

export async function runHoldCleanup() {
  const count = await releaseExpiredHolds();
  return { releasedCount: count };
}