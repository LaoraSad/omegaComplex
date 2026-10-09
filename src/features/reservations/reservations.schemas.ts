import { z } from "zod";

// ---------------------------------------------------------------------------
// Datos que entra el cliente en el modal de reserva (SCRUM sección 9).
//
// El titular de la cuenta es el acompañante número 1: se arma solo desde la
// sesión, el cliente no lo escribe. Los demás sí se piden.
// ---------------------------------------------------------------------------

const fechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha válida");

const slotIdSchema = z.string().trim().uuid("La franja seleccionada no es válida");

const documentoSchema = z
  .string()
  .trim()
  .min(5, "El documento es obligatorio")
  .max(20, "El documento es demasiado largo")
  .regex(/^[\p{L}\d][\p{L}\d.-]{4,19}$/u, "Ingresa un documento válido");

const nombreSchema = z
  .string()
  .trim()
  .min(3, "Escribe el nombre completo")
  .max(120, "El nombre es demasiado largo");

/** Un acompañante: nombre y documento. El titular no se incluye aquí. */
export const guestSchema = z.object({
  fullName: nombreSchema,
  document: documentoSchema,
});

/** Cuántas personas van en total, contando al titular. */
const personasSchema = z.coerce
  .number({ message: "Indica cuántas personasAssistirán" })
  .int("La cantidad debe ser un número entero")
  .min(1, "Debe asistir al menos una persona")
  .max(50, "La cantidad es demasiado alta");

/**
 * Un tramo que el cliente quiere reservar: una instalación y una franja.
 *
 * Una reserva puede traer varios. Si alguien pide piscina y luego baloncesto,
 * son dos bloques de la misma compra: se cobran juntos, se confirma el pago
 * una vez y dan un QR por zona a cada persona. Los bloques no tienen que ser
 * contiguos ni del mismo tipo de instalación, pero sí cronológicamente
 * ordenables y sin pisarse entre sí.
 */
export const bloqueSchema = z.object({
  serviceId: z.string().trim().uuid("La instalación no es válida"),
  slotId: slotIdSchema,
  fecha: fechaSchema,
});

export const createReservationSchema = z.object({
  bloques: z
    .array(bloqueSchema)
    .min(1, "Elige al menos una franja")
    .max(12, "No se pueden agregar más de 12 franjas en una sola reserva"),
  personas: personasSchema,
  /** Acompañantes: personas - 1. Si van 3 personas, aquí van 2. */
  acompañantes: z.array(guestSchema).default([]),
});

/** El teléfono del aviso va aparte: es un contacto, no un dato de la reserva. */
export const reservationContactSchema = z.object({
  telefono: z
    .string()
    .trim()
    .max(20, "El teléfono es demasiado largo")
    .regex(/^\+?[\d\s().-]*$/, "Ingresa un teléfono válido")
    .optional()
    .or(z.literal("")),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type GuestInput = z.infer<typeof guestSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos ingresados.";
}