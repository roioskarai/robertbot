import { describe, it, expect } from "vitest";
import { deriveSubscriptionState } from "@/lib/subscription";
import { PRICING } from "@/lib/plans";

const NOW = new Date("2026-07-08T12:00:00Z");
const in5days = new Date("2026-07-13T12:00:00Z").toISOString();
const yesterday = new Date("2026-07-07T12:00:00Z").toISOString();
const nextMonth = new Date("2026-08-08T12:00:00Z").toISOString();

describe("deriveSubscriptionState — the critical trial-vs-paid fix", () => {
  it("a fresh trial user NEVER shows a price", () => {
    const s = deriveSubscriptionState(
      { plan: "basic", subscription_status: "trial", trial_ends_at: in5days },
      NOW,
    );
    expect(s.status).toBe("trial");
    expect(s.priceIls).toBeNull();
    expect(s.isPaying).toBe(false);
    expect(s.trialDaysLeft).toBe(5);
    expect(s.headlineHe).toContain("ניסיון חינם");
  });

  it("splits an expired trial into its own state (raw column still 'trial')", () => {
    const s = deriveSubscriptionState(
      { plan: "pro", subscription_status: "trial", trial_ends_at: yesterday },
      NOW,
    );
    expect(s.status).toBe("trial_expired");
    expect(s.priceIls).toBeNull();
    expect(s.trialDaysLeft).toBe(0);
    expect(s.canPurchasePacks).toBe(false);
  });

  it("an active paid user shows the real plan price", () => {
    const s = deriveSubscriptionState(
      { plan: "business", subscription_status: "active", billing_cycle: "monthly", subscription_ends_at: nextMonth },
      NOW,
    );
    expect(s.status).toBe("active");
    expect(s.isPaying).toBe(true);
    expect(s.priceIls).toBe(PRICING.business.monthly);
    expect(s.canPurchasePacks).toBe(true);
  });

  it("annual cycle prices from the annual column", () => {
    const s = deriveSubscriptionState(
      { plan: "pro", subscription_status: "active", billing_cycle: "annual" },
      NOW,
    );
    expect(s.priceIls).toBe(PRICING.pro.annual);
  });

  it("cancel-at-period-end becomes cancel_scheduled but keeps paying", () => {
    const s = deriveSubscriptionState(
      { plan: "pro", subscription_status: "active", cancel_at_period_end: true, subscription_ends_at: nextMonth },
      NOW,
    );
    expect(s.status).toBe("cancel_scheduled");
    expect(s.isPaying).toBe(true);
    expect(s.sublineHe).toContain("לא יתחדש");
  });

  it("a comp (admin-granted) plan is active but NOT paying and carries no price", () => {
    const s = deriveSubscriptionState(
      { plan: "business", subscription_status: "active", is_comp: true },
      NOW,
    );
    expect(s.status).toBe("active");
    expect(s.isComp).toBe(true);
    expect(s.isPaying).toBe(false);
    expect(s.priceIls).toBeNull();
    expect(s.headlineHe).toContain("הענקה");
  });

  it("paused and cancelled never show a price", () => {
    const paused = deriveSubscriptionState({ plan: "pro", subscription_status: "paused" }, NOW);
    expect(paused.status).toBe("paused");
    expect(paused.priceIls).toBeNull();

    const cancelled = deriveSubscriptionState({ plan: "pro", subscription_status: "cancelled" }, NOW);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.priceIls).toBeNull();
    expect(cancelled.canPurchasePacks).toBe(false);
  });

  it("garbage / empty input falls back to a safe trial with basic plan", () => {
    const s = deriveSubscriptionState({}, NOW);
    expect(s.plan).toBe("basic");
    expect(s.status).toBe("trial");
    expect(s.priceIls).toBeNull();

    const junkPlan = deriveSubscriptionState({ plan: "gold", subscription_status: "active" }, NOW);
    expect(junkPlan.plan).toBe("basic");
    expect(junkPlan.priceIls).toBe(PRICING.basic.monthly);
  });
});
