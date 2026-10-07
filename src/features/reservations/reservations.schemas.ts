import { z } from "zod";

export const createReservationSchema = z.object({
  serviceId: z.string().uuid("ID de servicio inválido"),
  startsAt: z.iso.datetime({ offset: true }).catch(() => { throw new Error("Fecha de inicio inválida"); }),
  endsAt: z.iso.datetime({ offset: true }).catch(() => { throw new Error("Fecha de fin inválida"); }),
  quantity: z.number().int().min(1).max(20).default(1),
  channel: z.enum(["online", "in_person"]).default("online"),
});

export const reservationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listReservationsQuerySchema = z.object({
  status: z.string().optional(),
  serviceId: z.string().uuid().optional(),
  channel: z.enum(["online", "in_person"]).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ReservationParams = z.infer<typeof reservationParamsSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;