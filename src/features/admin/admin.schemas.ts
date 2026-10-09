import { z } from "zod";

// Validación de la gestión de empleados (SCRUM sección 21).
// El documento y el correo son únicos en la base de datos, por eso se
// recortan y normalizan antes de validar.

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Correo electrónico inválido")
  .max(255);

const firstNameSchema = z.string().trim().min(1, "El nombre es obligatorio").max(100);
const lastNameSchema = z.string().trim().min(1, "El apellido es obligatorio").max(100);

const documentSchema = z
  .string()
  .trim()
  .min(1, "El documento es obligatorio")
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

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener mínimo 8 caracteres")
  .max(100);

// Cada empleado tiene al menos una zona asignada (SCRUM pregunta 37): es lo que
// permite al empleado detectar que el QR no corresponde a su zona.
const serviceIdsSchema = z
  .array(z.string().trim().min(1, "Zona inválida"))
  .min(1, "Asigna al menos una zona al empleado")
  .max(50, "Demasiadas zonas asignadas");

export const employeeCreateSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  document: documentSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  serviceIds: serviceIdsSchema,
});

export const employeeProfileSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  document: documentSchema,
  phone: phoneSchema,
});

export const employeePasswordSchema = z.object({
  password: passwordSchema,
});

export const employeeZonesSchema = z.object({
  serviceIds: serviceIdsSchema,
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeProfileInput = z.infer<typeof employeeProfileSchema>;
export type EmployeePasswordInput = z.infer<typeof employeePasswordSchema>;
export type EmployeeZonesInput = z.infer<typeof employeeZonesSchema>;

/** Convierte los issues de Zod en un mensaje único para los formularios. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos ingresados.";
}