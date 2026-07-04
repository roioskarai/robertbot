import { describe, it, expect } from "vitest";
import { resolvePlanId, isPlanId, planLabelHe, PRICING, PLAN_LIMITS, PLAN_IDS } from "@/lib/plans";

describe("resolvePlanId — the single plan fallback", () => {
  it("passes valid plan ids through", () => {
    expect(resolvePlanId("basic")).toBe("basic");
    expect(resolvePlanId("pro")).toBe("pro");
    expect(resolvePlanId("business")).toBe("business");
    expect(resolvePlanId("enterprise")).toBe("enterprise");
  });

  it("falls back to basic for anything else (never pro)", () => {
    expect(resolvePlanId("")).toBe("basic");
    expect(resolvePlanId(undefined)).toBe("basic");
    expect(resolvePlanId(null)).toBe("basic");
    expect(resolvePlanId("gold")).toBe("basic");
    expect(resolvePlanId(42)).toBe("basic");
  });
});

describe("plan data integrity", () => {
  it("every plan id has a label, pricing and limits", () => {
    for (const id of PLAN_IDS) {
      expect(isPlanId(id)).toBe(true);
      expect(planLabelHe(id)).toBeTruthy();
      expect(PRICING[id].monthly).toBeGreaterThan(0);
      expect(PRICING[id].annual).toBeGreaterThan(0);
      expect(PLAN_LIMITS[id].bots).toBeGreaterThan(0);
      expect(PLAN_LIMITS[id].messages).toBeGreaterThan(0);
    }
  });

  it("annual is cheaper than monthly for every plan", () => {
    for (const id of PLAN_IDS) {
      expect(PRICING[id].annual).toBeLessThan(PRICING[id].monthly);
    }
  });
});
