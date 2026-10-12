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

/**
 * Por qué un día no tiene franjas reservables.
 *
 * Antes era un string suelto y `null` significaba varias cosas a la vez, que es
 * como el modal llegaba a mostrarle "no hay franjas" a un cliente un martes a las
 * 6 de la tarde, cuando el día estaba abierto y lo único era que ya había
 * terminado.
 */
export type CierreMotivo =
  | "festivo"
  | "mantenimiento"
  | "cierre_admin"
  | "sin_horario"
  | "horario_invalido"
  | "sin_franjas"
  | "franjas_terminadas"
  | null;

export type DayAvailability = {
  serviceId: string;
  serviceName: string;
  date: string;
  capacity: number;
  /** El complejo opera ese día, haya o no franjas reservables. */
  open: boolean;
  /** Hay al menos una franja que todavía se puede tomar. */
  hayDisponibilidad: boolean;
  /** Motivo tipado del cierre. La UI decide el texto a partir de esto. */
  motivo: CierreMotivo;
  /** Texto legible del motivo, para mostrar tal cual. */
  reason: string | null;
  /**
   * Nombre del festivo si ese día es festivo. El festivo NO cierra: abre el
   * complejo y desplaza el mantenimiento al martes de esa semana.
   */
  festivo?: string | null;
  openTime?: string;
  closeTime?: string;
  closureReason: string | null;
  slots: SlotAvailability[];
};