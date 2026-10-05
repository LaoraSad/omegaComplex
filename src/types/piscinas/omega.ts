export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  panoramaUrl: string;
  categoryId: string;
  categoryName: string;
  status: 'active' | 'inactive';
  capacity: number;
  durationMinutes: number;
  pricePerHour: number;
  schedules: string[];
  availableDays: string[];
  rules?: string[];
  tour360Id?: string;
}

export type ReservationStatus =
  | 'pending_payment'
  | 'payment_processing'
  | 'confirmed'
  | 'payment_rejected'
  | 'expired'
  | 'used';

export interface ReservationTicket {
  ticketId: string;
  ticketNumber: number;
  qrCodeUrl: string;
  qrCodeValue: string;
  status: 'valid' | 'used' | 'expired';
}

export interface Reservation {
  id: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // "14:00 - 15:00"
  ticketsCount: number;
  totalPrice: number;
  status: ReservationStatus;
  createdAt: string;
  lockExpiresAt?: string; // Para el bloqueo de 10 min
  tickets: ReservationTicket[];
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string; // No editable
  phone: string; // Editable
  birthDate: string;
  email: string; // Editable
}
