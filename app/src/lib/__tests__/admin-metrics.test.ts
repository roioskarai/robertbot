import { describe, it, expect } from "vitest";
import { isPaying, isComp, monthlyPrice, payingMetrics } from "@/lib/admin-metrics";
import { PRICING } from "@/lib/plans";

// Comp grants (admin item #9) must NEVER inflate MRR / paying counts.

describe("admin-metrics — comp exclusion", () => {
  const paying = { plan: "pro", billing_cycle: "monthly", subscription_status: "active", is_comp: false };
  const comp = { plan: "business", billing_cycle: "monthly", subscription_status: "active", is_comp: true };
  const trial = { plan: "basic", billing_cycle: "monthly", subscription_status: "trial", is_comp: false };
  const cancelled = { plan: "pro", billing_cycle: "monthly", subscription_status: "cancelled", is_comp: false };

  it("classifies paying vs comp vs neither", () => {
    expect(isPaying(paying)).toBe(true);
    expect(isPaying(comp)).toBe(false);
    expect(isPaying(trial)).toBe(false);
    expect(isComp(comp)).toBe(true);
    expect(isComp(paying)).toBe(false);
    expect(isComp(cancelled)).toBe(false); // expired comp → no longer active
  });

  it("monthlyPrice follows PRICING per cycle, unknown plan → 0", () => {
    expect(monthlyPrice(paying)).toBe(PRICING.pro.monthly);
    expect(monthlyPrice({ ...paying, billing_cycle: "annual" })).toBe(PRICING.pro.annual);
    expect(monthlyPrice({ ...paying, plan: "nope" })).toBe(0);
  });

  it("payingMetrics: MRR excludes comps entirely", () => {
    const m = payingMetrics([paying, comp, trial, cancelled]);
    expect(m.paying).toBe(1);
    expect(m.comps).toBe(1);
    expect(m.mrr).toBe(PRICING.pro.monthly); // the business comp adds ₪0
    expect(m.planMix).toEqual({ pro: 1 }); // comp's plan not in the paying mix
  });

  it("payingMetrics: empty list → zeros", () => {
    expect(payingMetrics([])).toEqual({ mrr: 0, planMix: {}, paying: 0, comps: 0 });
  });

  it("missing is_comp column (pre-migration rows) behaves as paying", () => {
    const legacy = { plan: "basic", billing_cycle: "monthly", subscription_status: "active" };
    const m = payingMetrics([legacy]);
    expect(m.paying).toBe(1);
    expect(m.mrr).toBe(PRICING.basic.monthly);
  });
});
