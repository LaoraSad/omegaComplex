import { findSessionUserById } from "@/features/auth";
import { toBogotaDateString } from "@/features/availability";
import { getSession } from "@/shared/auth/session";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/http/errors";

import {
  createReservationWithHold,
  findCustomerByUserId,
  findReservationByIdForCustomer,
  findReservationsByCustomer,
  findServiceById,
  findSlotById,
} from "./reservations.repository";
import { reservationIdSchema } from "./reservations.schemas";
import type { CreateReservationInput } from "./reservations.schemas";
import type { ReservationPayload, ReservationRow } from "./reservations.types";

/**
 * Minutos que el bloqueo temporal permanece activo. Es el mismo valor que ya
 * documenta el frontend (`src/types/piscinas/omega.ts`: "Para el bloqueo de 10 min").
 * Pasado ese plazo el hold queda vencido y el cupo debe liberarlo el módulo de pagos.
 */
const HOLD_MINUTES = 10;

/**
 * Resuelve el cliente autenticado y su `Customer`.
 *
 * El `customerId` SIEMPRE sale de la sesión: el body de la reserva no lo acepta,
 * así que un usuario no puede crear reservas a nombre de otro.
 */
async function requireSessionCustomer(): Promise<string> {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError("No autenticado");
  }

  // Se revalida el usuario en base de datos: un token válido de un usuario
  // desactivado no debe permitir operar.
  const user = await findSessionUserById(session.userId);

  if (!user) {
    throw new UnauthorizedError("No autenticado");
  }

  const customer = await findCustomerByUserId(user.id);

  if (!customer) {
    throw new ForbiddenError("El usuario no tiene un perfil de cliente asociado");
  }

  return customer.id;
}

function toReservationPayload(row: ReservationRow): ReservationPayload {
  const hold = row.holds[0];

  return {
    id: row.id,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    categoryName: row.service.category.name,
    date: toBogotaDateString(row.startsAt),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    quantity: row.quantity,
    totalCop: row.totalCop,
    status: row.status,
    channel: row.channel,
    createdAt: row.createdAt.toISOString(),
    slots: row.slots.map((entry) => ({
      slotId: entry.slot.id,
      startsAt: entry.slot.startsAt.toISOString(),
      endsAt: entry.slot.endsAt.toISOString(),
      quantity: entry.quantity,
    })),
    hold: hold
      ? {
          id: hold.id,
          status: hold.status,
          expiresAt: hold.expiresAt.toISOString(),
        }
      : null,
  };
}

/**
 * RES-01: crea una reserva online para el cliente autenticado.
 *
 * Valida el servicio y la franja, descarta franjas ya iniciadas y delega el
 * incremento de cupos en el repositorio, que es quien lo hace de forma atómica.
 */
export async function createReservation(
  input: CreateReservationInput,
): Promise<ReservationPayload> {
  const customerId = await requireSessionCustomer();

  const service = await findServiceById(input.serviceId);

  if (!service) {
    throw new NotFoundError("El servicio no existe");
  }

  const slot = await findSlotById(input.slotId);

  // No se distingue "no existe" de "es de otro servicio": responder distinto
  // confirmaría la existencia de franjas ajenas al servicio pedido.
  if (!slot || slot.serviceId !== input.serviceId) {
    throw new NotFoundError("La franja no existe para el servicio indicado");
  }

  if (slot.startsAt.getTime() <= Date.now()) {
    throw new ConflictError("La franja seleccionada ya comenzó");
  }

  if (input.quantity > slot.capacity) {
    throw new ConflictError("La cantidad solicitada supera la capacidad de la franja");
  }

  // El total se calcula con el precio vigente del servicio: `totalCop` del body
  // no es una fuente confiable (el cliente podría enviarlo manipulado).
  const row = await createReservationWithHold({
    customerId,
    serviceId: service.id,
    slotId: slot.id,
    quantity: input.quantity,
    totalCop: service.price * input.quantity,
    holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
  });

  return toReservationPayload(row);
}

/** RES-02: lista únicamente las reservas del cliente autenticado. */
export async function listMyReservations(): Promise<ReservationPayload[]> {
  const customerId = await requireSessionCustomer();
  const rows = await findReservationsByCustomer(customerId);

  return rows.map(toReservationPayload);
}

/** RES-03: detalle de una reserva, solo si pertenece al cliente autenticado. */
export async function getMyReservationById(
  id: string,
): Promise<ReservationPayload> {
  // Un id con formato inválido es un dato mal formado (400), no una reserva
  // inexistente: son dos cosas distintas y una revela información de la otra.
  const parsedId = reservationIdSchema.safeParse(id);

  if (!parsedId.success) {
    throw new ValidationError("El id de la reserva debe ser un UUID válido");
  }

  const customerId = await requireSessionCustomer();
  const row = await findReservationByIdForCustomer(parsedId.data, customerId);

  // Mismo 404 para "no existe" y "es de otro cliente": no se revela la existencia
  // de reservas ajenas.
  if (!row) {
    throw new NotFoundError("La reserva no existe");
  }

  return toReservationPayload(row);
}