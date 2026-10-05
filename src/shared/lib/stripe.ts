// Cliente Stripe (solo servidor).
// Se inicializa de forma perezosa para no exigir claves en build/test.
import Stripe from "stripe";

import { env } from "./env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return cached;
}
