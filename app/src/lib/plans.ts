// Plan limits, pricing and message packs.
// Updated to the 4-tier model from robert-pricing.html:
//   basic (בסיסי) · pro (מקצועי) · business (עסקים) · enterprise (ארגוני)

export const PLAN_LIMITS = {
  basic: { bots: 1, messages: 300, features: ["basic_qa", "whatsapp", "appointments", "packs"] },
  pro: {
    bots: 2,
    messages: 1000,
    features: ["basic_qa", "whatsapp", "smart_chat", "appointments", "calendar_full", "leads", "handoff", "analytics_basic", "packs"],
  },
  business: {
    bots: 5,
    messages: 6000,
    features: ["basic_qa", "whatsapp", "smart_chat", "memory", "appointments", "calendar_full", "calendar_sync", "leads", "lead_filter", "handoff", "analytics_full", "priority_support", "packs"],
  },
  enterprise: {
    bots: 15,
    messages: 15000,
    features: ["basic_qa", "whatsapp", "smart_chat", "memory", "appointments", "calendar_full", "calendar_sync", "leads", "lead_filter", "handoff", "analytics_full", "multi_business", "api", "white_label", "priority_support", "support_247", "packs"],
  },
} as const;

export const PRICING = {
  basic: { monthly: 99, annual: 79 },
  pro: { monthly: 199, annual: 159 },
  business: { monthly: 399, annual: 319 },
  enterprise: { monthly: 699, annual: 559 },
} as const;

// Message Packs — one-time purchases, never expire.
// Pack is consumed AFTER monthly quota is exhausted.
// On renewal: monthly quota resets first, pack balance carries over.
export const MESSAGE_PACKS = [
  { id: "starter", name: "Starter", messages: 200, price: 19 },
  { id: "regular", name: "Regular", messages: 500, price: 39 },
  { id: "large", name: "Large", messages: 1000, price: 69 },
  { id: "xl", name: "XL", messages: 3000, price: 179 },
] as const;

export type PlanId = keyof typeof PLAN_LIMITS;
export type BillingCycle = "monthly" | "annual";
export type PackId = (typeof MESSAGE_PACKS)[number]["id"];

export const PLAN_IDS: PlanId[] = ["basic", "pro", "business", "enterprise"];

const HE_LABELS: Record<PlanId, string> = {
  basic: "בסיסי",
  pro: "מקצועי",
  business: "עסקים",
  enterprise: "ארגוני",
};

const EN_LABELS: Record<PlanId, string> = {
  basic: "Basic",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

export function isPlanId(value: string): value is PlanId {
  return value === "basic" || value === "pro" || value === "business" || value === "enterprise";
}

export function planLabelHe(plan: PlanId): string {
  return HE_LABELS[plan];
}

export function planLabelEn(plan: PlanId): string {
  return EN_LABELS[plan];
}

/** Annual savings in ₪ vs paying monthly for a full year. */
export function annualSaving(plan: PlanId): number {
  return (PRICING[plan].monthly - PRICING[plan].annual) * 12;
}

/**
 * Parse a Stripe checkout `product` identifier such as
 * `pro_annual`, `business_monthly`, `pack_regular`.
 */
export function parseProduct(product: string):
  | { kind: "plan"; plan: PlanId; cycle: BillingCycle }
  | { kind: "pack"; pack: PackId }
  | null {
  if (product.startsWith("pack_")) {
    const id = product.slice("pack_".length);
    const pack = MESSAGE_PACKS.find((p) => p.id === id);
    return pack ? { kind: "pack", pack: pack.id } : null;
  }
  const [plan, cycle] = product.split("_");
  if (isPlanId(plan) && (cycle === "monthly" || cycle === "annual")) {
    return { kind: "plan", plan, cycle };
  }
  return null;
}

export function packById(id: PackId) {
  return MESSAGE_PACKS.find((p) => p.id === id)!;
}
