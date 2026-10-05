import { z } from "zod";

const documentSchema = z
  .string()
  .trim()
  .min(1, "El documento de identidad es obligatorio")
  .max(20, "El documento es demasiado largo")
  .regex(/^[\p{L}\d][\p{L}\d.-]{2,19}$/u, "Ingresa un documento válido");

const phoneSchema = z
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

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido").max(255),
  password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres").max(100),
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  document: documentSchema,
  phone: phoneSchema,
  birthDate: birthDateSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
