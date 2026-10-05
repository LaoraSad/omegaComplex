import { z } from "zod";

// `z.string().uuid()` está deprecado en Zod 4; se usa `z.uuid()` sobre el string
// ya recortado para conservar el `.trim()` del estilo del proyecto.
const uuidSchema = (field: string) =>
  z.string().trim().pipe(z.uuid(`${field} debe ser un UUID válido`));

/**
 * Body de POST /api/reservations.
 * No incluye `customerId` ni `totalCop`: el cliente se toma de la sesión y el
 * total se calcula con el precio del servicio en el servidor.
 */
export const createReservationSchema = z.object({
  serviceId: uuidSchema("El serviceId"),
  slotId: uuidSchema("El slotId"),
  // El límite real de cupos lo impone la capacidad de la franja (409 si no alcanza);
  // el `max` de aquí solo evita valores absurdos que revientarían el `CAST` a
  // INTEGER del UPDATE guardado contra sobreventa.
  quantity: z
    .number("La cantidad debe ser un número entero")
    .int("La cantidad debe ser un número entero")
    .min(1, "Debes reservar al menos 1 cupo")
    .max(9999, "La cantidad solicitada es demasiado alta"),
});

/** Path param de GET /api/reservations/:id. */
export const reservationIdSchema = uuidSchema("El id de la reserva");

export type CreateReservationInput = z.infer<typeof createReservationSchema>;