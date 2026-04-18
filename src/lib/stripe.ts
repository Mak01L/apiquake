import Stripe from "stripe";
import { env } from "./env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const PRICE_BY_PLAN: Record<string, string> = {
  pro: env.STRIPE_PRICE_PRO,
  team: env.STRIPE_PRICE_TEAM,
  business: env.STRIPE_PRICE_BUSINESS,
};
