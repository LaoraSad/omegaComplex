const API_BASE = "";

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error?.message || "Error en la petición") as Error & { code?: string; status?: number };
    error.code = data.error?.code;
    error.status = res.status;
    throw error;
  }

  return data.data as T;
}

export interface AvailabilitySlot {
  slotId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  heldCount: number;
  availableCapacity: number;
}

export interface DayAvailability {
  date: string;
  isMaintenanceDay: boolean;
  maintenanceReason?: string;
  slots: AvailabilitySlot[];
}

export async function getAvailability(serviceId: string, date: string): Promise<DayAvailability> {
  return apiRequest<DayAvailability>(`/api/availability?serviceId=${serviceId}&date=${date}`);
}

export interface CreateReservationInput {
  serviceId: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
  channel?: "online" | "in_person";
}

export interface CreateReservationResult {
  reservationId: string;
  holdId: string;
  holdExpiresAt: string;
  stripeCheckoutUrl: string | null;
  totalCop: number;
}

export async function createReservation(input: CreateReservationInput): Promise<CreateReservationResult> {
  return apiRequest<CreateReservationResult>("/api/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface Reservation {
  id: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  date: string;
  timeSlot: string;
  ticketsCount: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  lockExpiresAt?: string;
  tickets: Array<{
    ticketId: string;
    ticketNumber: number;
    qrCodeUrl: string;
    qrCodeValue: string;
    status: string;
  }>;
}

export async function getMyReservations(): Promise<Reservation[]> {
  return apiRequest<Reservation[]>("/api/reservations");
}

export async function getReservationById(id: string): Promise<Reservation> {
  return apiRequest<Reservation>(`/api/reservations?id=${id}`);
}