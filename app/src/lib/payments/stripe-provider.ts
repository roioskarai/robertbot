// Stripe implementation of the PaymentProvider interface.
// Kept available behind the abstraction for international/fallback use;
// the default provider is Grow (see ./index.ts).

import type Stripe from "stripe";
import { getStripe, hasStripeKey, planLineItem, packLineItem } from "@/lib/stripe";
import type { PlanId, BillingCycle, PackId } from "@/lib/plans";
import type {
  CheckoutInput,
  CheckoutOutput,
  PaymentEvent,
  PaymentProvider,
} from "./types";

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  isConfigured() {
    return hasStripeKey();
  },

  hasPortal() {
    return true;
  },

  async createCheckout(input: CheckoutInput): Promise<CheckoutOutput> {
    const stripe = getStripe();

    let customerId = input.customerId ?? undefined;
    let createdCustomerId: string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: input.email,
        metadata: { user_id: input.userId },
      });
      customerId = customer.id;
      createdCustomerId = customer.id;
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: input.kind === "plan" ? "subscription" : "payment",
      customer: customerId,
      line_items: [
        input.kind === "plan"
          ? planLineItem(input.plan!, input.cycle!)
          : packLineItem(input.pack!),
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      locale: "auto",
      metadata: {
        user_id: input.userId,
        product: input.product,
        ...(input.kind === "plan"
          ? { plan: input.plan!, cycle: input.cycle! }
          : { pack: input.pack! }),
      },
    });

    return { url: checkout.url!, customerId: createdCustomerId };
  },

  async getPortalUrl(customerId: string, returnUrl: string): Promise<string> {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return portal.url;
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  },

  async pauseSubscription(subscriptionId: string): Promise<void> {
    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, {
      pause_collection: { behavior: "void" },
    });
  },

  async parseWebhook(req: Request): Promise<PaymentEvent> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET missing");
    }
    const stripe = getStripe();
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new Error("missing stripe-signature");

    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.user_id;
        if (!userId) return { type: "ignore" };
        if (s.mode === "subscription") {
          return {
            type: "subscription_active",
            userId,
            plan: s.metadata?.plan as PlanId | undefined,
            cycle: s.metadata?.cycle as BillingCycle | undefined,
            subscriptionId: typeof s.subscription === "string" ? s.subscription : null,
            customerId: typeof s.customer === "string" ? s.customer : null,
          };
        }
        if (s.mode === "payment" && s.metadata?.pack) {
          return { type: "pack_purchased", userId, pack: s.metadata.pack as PackId };
        }
        return { type: "ignore" };
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.cancel_at_period_end || sub.status === "canceled") {
          return { type: "subscription_cancelled", subscriptionId: sub.id };
        }
        if (sub.status === "paused") {
          return { type: "subscription_paused", subscriptionId: sub.id };
        }
        return { type: "ignore" };
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        return { type: "subscription_cancelled", subscriptionId: sub.id };
      }

      default:
        return { type: "ignore" };
    }
  },
};
