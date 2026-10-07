import Stripe from "stripe";
import { env } from "./env";

if (!env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY no está configurado");
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  typescript: true,
});