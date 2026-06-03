import Stripe from "stripe";
import { PRICING, packById, planLabelHe, type PackId, type PlanId, type BillingCycle } from "./plans";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY חסר — סליקה אינה זמינה כרגע");
  }
  if (!_stripe) {
    // No explicit apiVersion — use the SDK's pinned default to avoid
    // tying the build to a specific dated version string.
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export function hasStripeKey(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

const ILS = "ils";

/** Inline price for a subscription plan (avoids pre-creating Stripe Prices). */
export function planLineItem(
  plan: PlanId,
  cycle: BillingCycle,
): Stripe.Checkout.SessionCreateParams.LineItem {
  const monthly = PRICING[plan][cycle];
  const amount = cycle === "annual" ? monthly * 12 : monthly;
  return {
    quantity: 1,
    price_data: {
      currency: ILS,
      unit_amount: amount * 100,
      recurring: { interval: cycle === "annual" ? "year" : "month" },
      product_data: {
        name: `Robert — מסלול ${planLabelHe(plan)} (${cycle === "annual" ? "שנתי" : "חודשי"})`,
      },
    },
  };
}

/** Inline price for a one-time message pack purchase. */
export function packLineItem(
  packId: PackId,
): Stripe.Checkout.SessionCreateParams.LineItem {
  const pack = packById(packId);
  return {
    quantity: 1,
    price_data: {
      currency: ILS,
      unit_amount: pack.price * 100,
      product_data: { name: `Robert — חבילת הודעות ${pack.name} (${pack.messages})` },
    },
  };
}
