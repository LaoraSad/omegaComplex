export type SlotAvailabilityStatus = 'disponible' | 'ocupado' | 'no_disponible' | 'bloqueado';

export interface TimeSlotAvailability {
  timeSlot: string; // ej. "08:00 - 09:00"
  status: SlotAvailabilityStatus;
  availableCapacity: number;
  totalCapacity: number;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  isMaintenanceDay: boolean;
  maintenanceReason?: string;
  slots: TimeSlotAvailability[];
}

/**
 * Abstracción para verificar disponibilidad de un servicio en una fecha.
 * La disponibilidad real vendrá del backend y sus cálculos de reservas y bloqueos temporales.
 */
export async function getAvailabilityForDate(
  serviceId: string,
  dateString: string
): Promise<DayAvailability> {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.

  // Regla: Lunes cerrado por mantenimiento
  const isMonday = dayOfWeek === 1;

  if (isMonday) {
    return Promise.resolve({
      date: dateString,
      isMaintenanceDay: true,
      maintenanceReason: 'Complejo cerrado los lunes por mantenimiento general.',
      slots: [],
    });
  }

  // Generación mock de estados de franjas según horario 08:00 a 17:00
  const slots: TimeSlotAvailability[] = [
    { timeSlot: '08:00 - 09:00', status: 'disponible', availableCapacity: 14, totalCapacity: 14 },
    { timeSlot: '09:00 - 10:00', status: 'disponible', availableCapacity: 8, totalCapacity: 14 },
    { timeSlot: '10:00 - 11:00', status: 'ocupado', availableCapacity: 0, totalCapacity: 14 },
    { timeSlot: '11:00 - 12:00', status: 'bloqueado', availableCapacity: 0, totalCapacity: 14 }, // Bloqueo temporal 10 min
    { timeSlot: '12:00 - 13:00', status: 'disponible', availableCapacity: 14, totalCapacity: 14 },
    { timeSlot: '13:00 - 14:00', status: 'disponible', availableCapacity: 6, totalCapacity: 14 },
    { timeSlot: '14:00 - 15:00', status: 'ocupado', availableCapacity: 0, totalCapacity: 14 },
    { timeSlot: '15:00 - 16:00', status: 'disponible', availableCapacity: 12, totalCapacity: 14 },
    { timeSlot: '16:00 - 17:00', status: 'no_disponible', availableCapacity: 0, totalCapacity: 14 },
  ];

  return Promise.resolve({
    date: dateString,
    isMaintenanceDay: false,
    slots,
  });
}
