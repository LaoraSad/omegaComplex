import { z } from "zod";

// Entradas del módulo de disponibilidad.

const fechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa una fecha válida (AAAA-MM-DD)");

export const dayAvailabilitySchema = z.object({
  serviceId: z.string().trim().min(1, "Falta la instalación"),
  fecha: fechaSchema,
});

export const rangeAvailabilitySchema = z
  .object({
    serviceId: z.string().trim().min(1, "Falta la instalación"),
    desde: fechaSchema,
    hasta: fechaSchema,
  })
  .refine((v) => v.hasta >= v.desde, {
    message: "La fecha final no puede ser anterior a la inicial",
    path: ["hasta"],
  });

export type DayAvailabilityInput = z.infer<typeof dayAvailabilitySchema>;
export type RangeAvailabilityInput = z.infer<typeof rangeAvailabilitySchema>;

/** Convierte los issues de Zod en un mensaje único. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos ingresados.";
}