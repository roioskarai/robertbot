// The ONE source of truth for what a user's subscription actually IS.
//
// The `users` table stores raw columns (plan, subscription_status, trial_ends_at,
// …) whose DEFAULTS make every fresh row look like `plan='basic'` +
// `subscription_status='trial'`. Reading those columns directly caused the
// critical bug where a brand-new trial user saw "מסלול בסיסי ₪99" as if they had
// paid. This module derives a single, display-ready state so no surface ever
// invents a plan/price/status of its own.
//
// Golden rule encoded here: `priceIls` is non-null ONLY when the user is truly
// paying. Trials never carry a price.

import { PRICING, resolvePlanId, planLabelHe, type PlanId, type BillingCycle } from "./plans";

export type SubscriptionUiStatus =
  | "trial"
  | "trial_expired"
  | "active"
  | "cancel_scheduled"
  | "paused"
  | "cancelled";

/** The subset of the `users` row this module reads. All optional/nullable so it
 *  is safe to call with a partial profile (or `{}` when none is provisioned). */
export interface SubscriptionRow {
  plan?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  billing_cycle?: string | null;
  cancel_at_period_end?: boolean | null;
  is_comp?: boolean | null;
}

export interface SubscriptionState {
  status: SubscriptionUiStatus;
  plan: PlanId;
  cycle: BillingCycle;
  /** Truly paying (active or scheduled-to-cancel) AND not an admin comp. */
  isPaying: boolean;
  /** Admin-granted free plan. */
  isComp: boolean;
  trialEndsAt: string | null;
  /** Whole days remaining on the trial (0 when expired), else null. */
  trialDaysLeft: number | null;
  periodEndsAt: string | null;
  /** Monthly ₪ price — ONLY when isPaying. null for trial/cancelled/paused. */
  priceIls: number | null;
  canPurchasePacks: boolean;
  /** Display-ready one-liners, so UIs never hand-assemble status copy. */
  headlineHe: string;
  sublineHe: string;
}

function heDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

function daysUntil(iso: string, now: Date): number {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - now.getTime()) / 86_400_000));
}

function daysWord(n: number): string {
  if (n === 1) return "נותר יום אחד";
  return `נותרו ${n} ימים`;
}

export function deriveSubscriptionState(
  row: SubscriptionRow,
  now: Date = new Date(),
): SubscriptionState {
  const plan = resolvePlanId(row.plan);
  const cycle: BillingCycle = row.billing_cycle === "annual" ? "annual" : "monthly";
  const raw = row.subscription_status ?? "trial";
  const trialEndsAt = row.trial_ends_at ?? null;
  const periodEndsAt = row.subscription_ends_at ?? null;
  const isComp = !!row.is_comp;

  // Resolve the display status. The key root fix: a "trial" whose date has
  // passed is a distinct `trial_expired` state (the raw column stays 'trial').
  let status: SubscriptionUiStatus;
  if (raw === "active") {
    status = row.cancel_at_period_end ? "cancel_scheduled" : "active";
  } else if (raw === "paused") {
    status = "paused";
  } else if (raw === "cancelled") {
    status = "cancelled";
  } else {
    // 'trial' or any unknown value → treat as trial, split by expiry.
    status = trialEndsAt && new Date(trialEndsAt).getTime() < now.getTime()
      ? "trial_expired"
      : "trial";
  }

  const isPaying = (status === "active" || status === "cancel_scheduled") && !isComp;
  const canPurchasePacks = status === "active" || status === "cancel_scheduled";
  const priceIls = isPaying ? PRICING[plan][cycle] : null;

  const trialDaysLeft =
    status === "trial" ? (trialEndsAt ? daysUntil(trialEndsAt, now) : null)
      : status === "trial_expired" ? 0
        : null;

  const label = planLabelHe(plan);
  let headlineHe: string;
  let sublineHe: string;
  switch (status) {
    case "trial":
      headlineHe = `ניסיון חינם — ${daysWord(trialDaysLeft ?? 0)}`;
      sublineHe = trialEndsAt
        ? `כולל את כל יכולות מסלול ${label} · מסתיים ב-${heDate(trialEndsAt)}`
        : `כולל את כל יכולות מסלול ${label}`;
      break;
    case "trial_expired":
      headlineHe = "תקופת הניסיון הסתיימה";
      sublineHe = "הבוטים הושבתו — בחר מסלול כדי להפעיל מחדש";
      break;
    case "active":
      headlineHe = `מסלול ${label}`;
      sublineHe = isComp
        ? (periodEndsAt ? `בתוקף עד ${heDate(periodEndsAt)}` : "מנוי פעיל")
        : (periodEndsAt ? `חידוש אוטומטי · ${heDate(periodEndsAt)}` : "מנוי פעיל");
      break;
    case "cancel_scheduled":
      headlineHe = `מסלול ${label}`;
      sublineHe = periodEndsAt ? `מסתיים ב-${heDate(periodEndsAt)} · לא יתחדש` : "מתוזמן לביטול";
      break;
    case "paused":
      headlineHe = `מסלול ${label} · מוקפא`;
      sublineHe = "המנוי מוקפא — אין חיוב";
      break;
    case "cancelled":
    default:
      headlineHe = "אין מנוי פעיל";
      sublineHe = "בחר מסלול כדי להפעיל את הבוט";
      break;
  }

  return {
    status,
    plan,
    cycle,
    isPaying,
    isComp,
    trialEndsAt,
    trialDaysLeft,
    periodEndsAt,
    priceIls,
    canPurchasePacks,
    headlineHe,
    sublineHe,
  };
}
