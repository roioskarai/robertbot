// Provider-agnostic payment types.
// The app talks to ONE of these providers (Grow / Stripe) chosen by the
// PAYMENT_PROVIDER env var. Everything outside src/lib/payments/* deals only
// with these normalized shapes — no provider SDK leaks into routes.

import type { PlanId, BillingCycle, PackId } from "../plans";

export type PaymentProviderId = "grow" | "stripe";

/** Input for opening a hosted checkout / payment page. */
export interface CheckoutInput {
  userId: string;
  email: string;
  product: string; // raw token, e.g. "pro_monthly" | "pack_regular"
  kind: "plan" | "pack";
  plan?: PlanId;
  cycle?: BillingCycle;
  pack?: PackId;
  /** Existing provider customer id, if the user already has one. */
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutOutput {
  /** URL to redirect the customer to. */
  url: string;
  /** A newly created provider customer id the caller should persist. */
  customerId?: string;
}

/**
 * Normalized webhook event. Each provider's parseWebhook() verifies the
 * request signature and maps the raw payload into one of these.
 */
export type PaymentEvent =
  | {
      type: "subscription_active";
      userId: string;
      plan?: PlanId;
      cycle?: BillingCycle;
      subscriptionId?: string | null;
      customerId?: string | null;
    }
  | { type: "pack_purchased"; userId: string; pack: PackId }
  | { type: "subscription_cancelled"; userId?: string; subscriptionId?: string | null }
  | { type: "subscription_paused"; userId?: string; subscriptionId?: string | null }
  | { type: "ignore" };

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** True when the required env keys are present (else demo mode). */
  isConfigured(): boolean;
  /** Whether the provider offers a self-service management portal (Stripe yes, Grow no). */
  hasPortal(): boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutOutput>;
  /** Only meaningful when hasPortal() is true. */
  getPortalUrl?(customerId: string, returnUrl: string): Promise<string>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  /** Verifies signature and returns a normalized event (throws on bad signature). */
  parseWebhook(req: Request): Promise<PaymentEvent>;
}
