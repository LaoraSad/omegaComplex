import { z } from "zod";

// `z.string().uuid()` está deprecado en Zod 4; se usa `z.uuid()` sobre el string
// ya recortado para conservar el `.trim()` del estilo del proyecto.
const uuidSchema = (field: string) =>
  z.string().trim().pipe(z.uuid(`${field} debe ser un UUID válido`));

// Valida el formato YYYY-MM-DD y que la fecha exista en el calendario:
// la expresión regular por sí sola acepta fechas inexistentes como 2026-02-30.
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa una fecha válida (AAAA-MM-DD)")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Ingresa una fecha válida (AAAA-MM-DD)");

export const availabilityQuerySchema = z.object({
  serviceId: uuidSchema("El serviceId"),
  date: dateSchema,
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;