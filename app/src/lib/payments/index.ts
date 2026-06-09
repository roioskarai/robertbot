// Payment provider selector. The active provider is chosen by PAYMENT_PROVIDER
// (default: "grow"). Routes import ONLY from here — never a provider SDK directly.

import { growProvider } from "./grow-provider";
import { stripeProvider } from "./stripe-provider";
import type { PaymentProvider, PaymentProviderId } from "./types";

export * from "./types";
export { applyPaymentEvent } from "./apply";

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  grow: growProvider,
  stripe: stripeProvider,
};

function selectedId(): PaymentProviderId {
  const id = (process.env.PAYMENT_PROVIDER || "grow").toLowerCase();
  return id === "stripe" ? "stripe" : "grow";
}

/** The active payment provider for this deployment. */
export function getPaymentProvider(): PaymentProvider {
  return PROVIDERS[selectedId()];
}

/** True when the active provider has its keys configured (else demo mode). */
export function hasPayment(): boolean {
  return getPaymentProvider().isConfigured();
}
