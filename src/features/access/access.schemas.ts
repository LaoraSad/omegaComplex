import { z } from "zod";

// Entradas del módulo de acceso (control de ingreso por QR).

/** Token crudo que viaja dentro del QR. El sistema solo guarda su hash. */
export const accessTokenSchema = z
  .string()
  .trim()
  .min(8, "El código QR está vacío o incompleto")
  .max(500, "El código QR no es válido");

export const validateRequestSchema = z.object({
  token: accessTokenSchema,
});

export const grantRequestSchema = z.object({
  token: accessTokenSchema,
});

export type ValidateInput = z.infer<typeof validateRequestSchema>;
export type GrantInput = z.infer<typeof grantRequestSchema>;

/** Convierte los issues de Zod en un mensaje único. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos ingresados.";
}