import type {
  HoldStatus,
  ReservationChannel,
  ReservationStatus,
} from "@prisma/client";

// Tipos del módulo de reservas (RES-01, RES-02, RES-03).

/**
 * Reserva tal como la devuelve el repositorio (filas de Prisma con relaciones).
 * Las fechas siguen siendo `Date`; el mapeo a ISO ocurre en el service.
 */
export type ReservationRow = {
  id: string;
  serviceId: string;
  status: ReservationStatus;
  channel: ReservationChannel;
  quantity: number;
  totalCop: number;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  service: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: {
      id: string;
      name: string;
    };
  };
  slots: {
    quantity: number;
    slot: {
      id: string;
      startsAt: Date;
      endsAt: Date;
    };
  }[];
  holds: {
    id: string;
    status: HoldStatus;
    expiresAt: Date;
  }[];
};

export type ReservationSlotInfo = {
  slotId: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
};

/** Datos del bloqueo temporal: el frontend los usa para mostrar la cuenta regresiva. */
export type ReservationHoldInfo = {
  id: string;
  status: HoldStatus;
  expiresAt: string;
};

/**
 * Payload de reserva que devuelven los tres endpoints del módulo
 * (POST /api/reservations, GET /api/reservations y GET /api/reservations/:id).
 */
export type ReservationPayload = {
  id: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  /** YYYY-MM-DD de `startsAt` interpretado en America/Bogota. */
  date: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
  totalCop: number;
  status: ReservationStatus;
  channel: ReservationChannel;
  createdAt: string;
  slots: ReservationSlotInfo[];
  hold: ReservationHoldInfo | null;
};