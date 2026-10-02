// TODO(auth): implementar auth.schemas.ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres"),
  firstName: z.string().min(1, "El nombre es obligatorio").max(100),
  lastName: z.string().min(1, "El apellido es obligatorio").max(100),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
