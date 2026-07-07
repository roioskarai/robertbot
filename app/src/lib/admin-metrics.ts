// Pure, testable revenue-metric helpers for the admin panel.
//
// Core rule (item #9): an admin-granted comp plan is `subscription_status =
// 'active'` + `is_comp = true`. Comps get full product access, but must NEVER
// count as paying customers or inflate MRR/ARR — the owner's revenue numbers
// have to reflect real money only.

import { PRICING, type PlanId, type BillingCycle } from "./plans";

export interface SubscriberRow {
  plan?: string | null;
  billing_cycle?: string | null;
  subscription_status?: string | null;
  is_comp?: boolean | null;
}

/** True for a customer that actually pays: active and NOT a comp grant. */
export function isPaying(row: SubscriberRow): boolean {
  return row.subscription_status === "active" && !row.is_comp;
}

/** True for an active admin comp (free) grant. */
export function isComp(row: SubscriberRow): boolean {
  return row.subscription_status === "active" && !!row.is_comp;
}

/** Monthly-equivalent price of a subscriber row (annual PRICING is per-month). */
export function monthlyPrice(row: SubscriberRow): number {
  const plan = row.plan as PlanId;
  const cycle = (row.billing_cycle as BillingCycle) ?? "monthly";
  return PRICING[plan]?.[cycle] ?? 0;
}

/** MRR + paying plan-mix + counts over a user list. Comps excluded from all revenue numbers. */
export function payingMetrics(rows: SubscriberRow[]): {
  mrr: number;
  planMix: Record<string, number>;
  paying: number;
  comps: number;
} {
  let mrr = 0;
  let paying = 0;
  let comps = 0;
  const planMix: Record<string, number> = {};
  for (const row of rows) {
    if (isComp(row)) {
      comps++;
      continue;
    }
    if (!isPaying(row)) continue;
    paying++;
    mrr += monthlyPrice(row);
    const plan = (row.plan as string) || "basic";
    planMix[plan] = (planMix[plan] ?? 0) + 1;
  }
  return { mrr, planMix, paying, comps };
}
