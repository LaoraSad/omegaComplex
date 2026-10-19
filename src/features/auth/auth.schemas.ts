// -----------------------------------------------------------------------------
// src/features/auth/auth.schemas.ts
// Validaciones Zod para registro, login, cambio de contraseña y actualización
// de perfil. Zod define la forma y reglas de los datos antes de que lleguen al servicio.
// -----------------------------------------------------------------------------

import { z } from "zod";

// -----------------------------------------------------------------------------
// documentSchema
// Valida documento de identidad: alfanumérico, entre 3 y 20 caracteres.
// -----------------------------------------------------------------------------
const documentSchema = z
  .string()
  .trim()
  .min(1, "El documento de identidad es obligatorio")
  .max(20, "El documento es demasiado largo")
  .regex(/^[\p{L}\d][\p{L}\d.-]{2,19}$/u, "Ingresa un documento válido");

// -----------------------------------------------------------------------------
// phoneSchema
// Valida teléfono: opcional signo +, dígitos, espacios, paréntesis, guiones y puntos.
// Entre 7 y 15 dígitos.
// -----------------------------------------------------------------------------
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "El teléfono es obligatorio")
  .max(20, "El teléfono es demasiado largo")
  .regex(/^\+?[\d\s().-]+$/, "Ingresa un teléfono válido")
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    },
    { message: "Ingresa un teléfono válido" },
  );

// -----------------------------------------------------------------------------
// birthDateSchema
// Valida fecha de nacimiento: formato AAAA-MM-DD, fecha válida y no futura.
// -----------------------------------------------------------------------------
const birthDateSchema = z
  .string()
  .trim()
  .min(1, "La fecha de nacimiento es obligatoria")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa una fecha válida (AAAA-MM-DD)")
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        date <= new Date()
      );
    },
    { message: "Ingresa una fecha de nacimiento válida y no futura" },
  );

// -----------------------------------------------------------------------------
// registerSchema
// Datos requeridos para registrar un cliente: email, password, nombres, documento, teléfono, fecha de nacimiento.
// -----------------------------------------------------------------------------
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido").max(255),
  password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres").max(100),
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  document: documentSchema,
  phone: phoneSchema,
  birthDate: birthDateSchema,
});

// -----------------------------------------------------------------------------
// loginSchema
// Datos para iniciar sesión: email y contraseña.
// -----------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

// -----------------------------------------------------------------------------
// changePasswordSchema
// Datos para cambiar contraseña: actual y nueva. La nueva debe ser diferente.
// -----------------------------------------------------------------------------
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener mínimo 8 caracteres")
      .max(100),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "La nueva contraseña debe ser distinta a la actual",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// -----------------------------------------------------------------------------
// updateProfileSchema
// Edición de perfil: solo teléfono y correo. .strict() rechaza campos extra
// (document, birthDate) para evitar edición no permitida (requisito 33-H).
// -----------------------------------------------------------------------------
export const updateProfileSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: z.string().trim().toLowerCase().email("Correo electrónico inválido").max(255).optional(),
  })
  .strict()
  .refine((value) => value.phone !== undefined || value.email !== undefined, {
    message: "Indica el teléfono o el correo a actualizar",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
