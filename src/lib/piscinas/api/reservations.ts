import { Reservation } from '@/types/piscinas/omega';

export const mockReservations: Reservation[] = [
  {
    id: 'res-101',
    serviceId: 'futbol-campo',
    serviceName: 'Cancha de Fútbol 11',
    categoryName: 'Canchas',
    date: '2026-10-15',
    timeSlot: '14:00 - 15:00',
    ticketsCount: 22,
    totalPrice: 120000,
    status: 'confirmed',
    createdAt: '2026-10-01T08:30:00Z',
    tickets: Array.from({ length: 4 }).map((_, i) => ({
      ticketId: `tkt-101-${i + 1}`,
      ticketNumber: i + 1,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=OMEGA-RES-101-TKT-${i + 1}`,
      qrCodeValue: `OMEGA-RES-101-TKT-${i + 1}`,
      status: 'valid',
    })),
  },
  {
    id: 'res-102',
    serviceId: 'piscina-olas',
    serviceName: 'Piscina de Olas',
    categoryName: 'Piscinas',
    date: '2026-10-18',
    timeSlot: '11:00 - 12:00',
    ticketsCount: 3,
    totalPrice: 60000,
    status: 'confirmed',
    createdAt: '2026-10-01T09:15:00Z',
    tickets: [
      {
        ticketId: 'tkt-102-1',
        ticketNumber: 1,
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=OMEGA-RES-102-TKT-1',
        qrCodeValue: 'OMEGA-RES-102-TKT-1',
        status: 'valid',
      },
      {
        ticketId: 'tkt-102-2',
        ticketNumber: 2,
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=OMEGA-RES-102-TKT-2',
        qrCodeValue: 'OMEGA-RES-102-TKT-2',
        status: 'valid',
      },
      {
        ticketId: 'tkt-102-3',
        ticketNumber: 3,
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=OMEGA-RES-102-TKT-3',
        qrCodeValue: 'OMEGA-RES-102-TKT-3',
        status: 'valid',
      },
    ],
  },
  {
    id: 'res-103',
    serviceId: 'bano-turco',
    serviceName: 'Baño Turco',
    categoryName: 'Zona húmeda',
    date: '2026-09-20',
    timeSlot: '15:00 - 16:00',
    ticketsCount: 1,
    totalPrice: 22000,
    status: 'used',
    createdAt: '2026-09-18T14:00:00Z',
    tickets: [
      {
        ticketId: 'tkt-103-1',
        ticketNumber: 1,
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=OMEGA-RES-103-TKT-1',
        qrCodeValue: 'OMEGA-RES-103-TKT-1',
        status: 'used',
      },
    ],
  },
];

export async function getUserReservations(): Promise<Reservation[]> {
  return Promise.resolve(mockReservations);
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  const res = mockReservations.find((r) => r.id === id);
  return Promise.resolve(res || null);
}
