// -----------------------------------------------------------------------------
// src/shared/lib/stripe.ts
// Inicialización perezosa (lazy) del cliente Stripe.
// Se inicializa solo cuando se llama por primera vez getStripe(), para no
// exigir STRIPE_SECRET_KEY durante el build de Next.js ni en los tests.
// -----------------------------------------------------------------------------

import Stripe from "stripe";
import { env } from "./env";

let cached: Stripe | null = null;

// -----------------------------------------------------------------------------
// getStripe()
// Devuelve una instancia singleton del cliente Stripe.
//   - Si ya existe en caché, la reutiliza.
//   - Si no, crea una nueva con env.STRIPE_SECRET_KEY.
//   - Se usa en servicios de pago y en el webhook de Stripe (solo servidor).
// -----------------------------------------------------------------------------
export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return cached;
}
