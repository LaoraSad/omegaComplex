import { z } from "zod";

// Entradas del módulo de acceso (control de ingreso por QR).

/**
 * Lo que el empleado entrega: el token crudo de la imagen del QR o el código
 * corto impreso en el correo (8 símbolos, p. ej. K7M2-XQP4) si la cámara falla.
 */
export const accessTokenSchema = z
  .string()
  .trim()
  .min(8, "El código está vacío o incompleto")
  .max(500, "El código no es válido");

export const validateRequestSchema = z.object({
  token: accessTokenSchema,
});

export const grantRequestSchema = z.object({
  token: accessTokenSchema,
});

/** Denegación explícita del empleado sobre un QR que era válido. */
export const denyRequestSchema = z.object({
  token: accessTokenSchema,
  /** Motivo que verá el administrador en Accesos. */
  reason: z.string().trim().max(200).optional(),
});

export type ValidateInput = z.infer<typeof validateRequestSchema>;
export type GrantInput = z.infer<typeof grantRequestSchema>;

/** Convierte los issues de Zod en un mensaje único. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos ingresados.";
}