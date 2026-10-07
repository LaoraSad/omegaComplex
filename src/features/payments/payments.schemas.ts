import { z } from "zod";

export const createPaymentSchema = z.object({
  reservationId: z.string().uuid("ID de reserva inválido"),
  amountCop: z.number().int().positive("Monto debe ser positivo"),
  method: z.enum(["card", "cash"]).default("card"),
  successUrl: z.url("URL de éxito inválida"),
  cancelUrl: z.url("URL de cancelación inválida"),
});

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.unknown(),
  }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;