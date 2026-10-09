// Tipos de disponibilidad. Derivados de los modelos reales: franjas, cupos y
// su estado, sin inventar campos.

export type SlotStatus = "available" | "full" | "past";

export type SlotAvailability = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  /** Cupos que aun se pueden tomar: capacidad menos confirmados y bloqueos. */
  free: number;
  status: SlotStatus;
};

export type DayAvailability = {
  serviceId: string;
  serviceName: string;
  date: string;
  capacity: number;
  open: boolean;
  reason: string | null;
  openTime?: string;
  closeTime?: string;
  closureReason: string | null;
  slots: SlotAvailability[];
};