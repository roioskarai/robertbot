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

/**
 * The ONE fallback for unknown/missing plan values, used by every display
 * surface. Falling back to different plans in different places produced
 * contradictory "current plan" labels on the same screen — never again.
 */
export function resolvePlanId(value: unknown): PlanId {
  return typeof value === "string" && isPlanId(value) ? value : "basic";
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

/** Per-message price of a pack, formatted "₪0.078 להודעה". */
export function packPerMessageHe(id: PackId): string {
  const p = packById(id);
  return `₪${(p.price / p.messages).toFixed(3)} להודעה`;
}

// Hebrew label for every feature identifier used in PLAN_LIMITS.features.
// Kept here so any surface can name a feature consistently.
export const PLAN_FEATURES_HE: Record<string, string> = {
  basic_qa: "מענה אוטומטי על שאלות",
  whatsapp: "חיבור וואטסאפ",
  smart_chat: "שיחות חכמות עם הלקוח",
  memory: "זיכרון שיחה אישי ללקוח",
  appointments: "קביעת תורים אוטומטית",
  calendar_full: "ניהול יומן מלא",
  calendar_sync: "סנכרון עם Google Calendar",
  leads: "לכידת לידים אוטומטית",
  lead_filter: "סינון לידים חכם",
  handoff: "העברה לנציג אנושי",
  analytics_basic: "דוחות וסטטיסטיקות",
  analytics_full: "דוחות וסטטיסטיקות",
  multi_business: "ניהול מספר עסקים",
  api: "API וחיבורים חיצוניים",
  white_label: "White-label",
  priority_support: "תמיכה מועדפת",
  support_247: "תמיכה ייעודית 24/7",
  packs: "Packs הודעות נוספות",
};

// The plan-card feature lists — the ONE source for the pricing grid everywhere
// (landing, /pricing, dashboard billing/store). Order and wording are the
// locked design; intentionally NOT derived from PLAN_LIMITS.features (which
// differ — e.g. Business hides "סינון לידים חכם" and each list leads with the
// agent-count line rather than a raw feature key).
const PLAN_INCLUDED_HE: Record<PlanId, string[]> = {
  basic: ["סוכן AI אחד", "מענה אוטומטי על שאלות", "קביעת תורים אוטומטית", "Packs הודעות נוספות"],
  pro: [
    "עד 2 סוכני AI", "מענה אוטומטי על שאלות", "שיחות חכמות עם הלקוח",
    "קביעת תורים אוטומטית", "ניהול יומן מלא", "לכידת לידים אוטומטית",
    "העברה לנציג אנושי", "דוחות וסטטיסטיקות", "Packs הודעות נוספות",
  ],
  business: [
    "עד 5 סוכני AI", "מענה אוטומטי על שאלות", "שיחות חכמות עם הלקוח",
    "זיכרון שיחה אישי ללקוח", "קביעת תורים אוטומטית", "ניהול יומן מלא",
    "סנכרון עם Google Calendar", "לכידת לידים אוטומטית", "העברה לנציג אנושי",
    "דוחות וסטטיסטיקות", "Packs הודעות נוספות", "תמיכה מועדפת",
  ],
  enterprise: [
    "עד 15 סוכני AI", "מענה אוטומטי על שאלות", "שיחות חכמות עם הלקוח",
    "זיכרון שיחה אישי ללקוח", "קביעת תורים אוטומטית", "ניהול יומן מלא",
    "סנכרון עם Google Calendar", "לכידת לידים אוטומטית", "העברה לנציג אנושי",
    "דוחות וסטטיסטיקות", "Packs הודעות נוספות", "ניהול מספר עסקים",
    "API וחיבורים חיצוניים", "תמיכה מועדפת", "תמיכה ייעודית 24/7",
  ],
};

const PLAN_LOCKED_HE: Record<PlanId, string[]> = {
  basic: [
    "שיחות חכמות עם הלקוח", "זיכרון שיחה אישי ללקוח", "ניהול יומן מלא",
    "סנכרון עם Google Calendar", "לכידת לידים אוטומטית", "העברה לנציג אנושי",
    "דוחות וסטטיסטיקות", "ניהול מספר עסקים", "API וחיבורים חיצוניים",
    "תמיכה מועדפת", "תמיכה ייעודית 24/7",
  ],
  pro: [
    "זיכרון שיחה אישי ללקוח", "סנכרון עם Google Calendar", "ניהול מספר עסקים",
    "API וחיבורים חיצוניים", "תמיכה מועדפת", "תמיכה ייעודית 24/7",
  ],
  business: ["ניהול מספר עסקים", "API וחיבורים חיצוניים", "תמיכה ייעודית 24/7"],
  enterprise: [],
};

/** Ordered Hebrew "included" list for the plan card. */
export function planIncludedFeatures(plan: PlanId): string[] {
  return PLAN_INCLUDED_HE[plan];
}

/** Ordered Hebrew "not included in this plan" list for the plan card. */
export function planLockedFeatures(plan: PlanId): string[] {
  return PLAN_LOCKED_HE[plan];
}

/** The two stat chips on a plan card: bots count + monthly message quota. */
export function planChips(plan: PlanId): string[] {
  const l = PLAN_LIMITS[plan];
  return [
    `${l.bots} ${l.bots === 1 ? "בוט" : "בוטים"}`,
    `${l.messages.toLocaleString("en-US")} הודעות`,
  ];
}
