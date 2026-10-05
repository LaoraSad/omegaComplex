// Tipos del módulo de disponibilidad (AVAIL-01).

/**
 * Fila de `ServiceSlot` tal como la devuelve el repositorio.
 * Se declara aquí (y no con `Prisma.XGetPayload`) para que el módulo no dependa
 * de tipos generados del cliente.
 */
export type ServiceSlotRow = {
  id: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  heldCount: number;
};

/**
 * Rango semiabierto [startUtc, endUtc) que representa un día local de Bogotá.
 * `ServiceSlot.startsAt` es `TIMESTAMP(3)` sin zona horaria y Prisma siempre
 * escribe UTC, así que para consultar "el día 2026-10-10" hay que transformar
 * los bordes del día local a UTC. Un rango semiabierto evita depender de
 * milisegundos (.999) y no deja huecos entre días consecutivos.
 */
export type DayRangeUtc = {
  startUtc: Date;
  endUtc: Date;
};

export type SlotAvailability = {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  heldCount: number;
  available: number;
};

export type AvailabilityByDay = {
  serviceId: string;
  /** YYYY-MM-DD del día consultado, interpretado en America/Bogota. */
  date: string;
  slots: SlotAvailability[];
};