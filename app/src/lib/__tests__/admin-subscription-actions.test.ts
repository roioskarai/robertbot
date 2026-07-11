import { describe, it, expect } from "vitest";
import { SUB_ACTIONS, simulate, actionsForState } from "@/lib/admin-subscription-actions";
import { deriveSubscriptionState } from "@/lib/subscription";

const NOW = new Date("2026-07-10T12:00:00.000Z");

const trialUser = {
  plan: "basic", subscription_status: "trial",
  trial_ends_at: "2026-07-14T12:00:00.000Z", subscription_ends_at: null,
  billing_cycle: "monthly", cancel_at_period_end: false, is_comp: false,
};
const activeUser = {
  plan: "pro", subscription_status: "active",
  trial_ends_at: null, subscription_ends_at: "2026-08-10T12:00:00.000Z",
  billing_cycle: "monthly", cancel_at_period_end: false, is_comp: false,
};
const compUser = { ...activeUser, is_comp: true, cancel_at_period_end: true };

const action = (id: string) => {
  const a = SUB_ACTIONS.find((x) => x.id === id);
  if (!a) throw new Error(`missing action ${id}`);
  return a;
};

describe("buildPatch", () => {
  it("change_plan emits only the plan", () => {
    const r = action("change_plan").buildPatch(activeUser, { plan: "business" }, NOW);
    expect(r).toEqual({ ok: true, patch: { plan: "business" } });
  });

  it("change_plan rejects an unknown plan", () => {
    const r = action("change_plan").buildPatch(activeUser, { plan: "vip" }, NOW);
    expect(r.ok).toBe(false);
  });

  it("extend_period moves trial_ends_at for trial users", () => {
    const r = action("extend_period").buildPatch(trialUser, { days: "14" }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.patch.trial_ends_at).toBe("2026-07-28T12:00:00.000Z");
      expect(r.patch.subscription_status).toBe("trial");
    }
  });

  it("extend_period moves subscription_ends_at for paying users, negative shortens", () => {
    const r = action("extend_period").buildPatch(activeUser, { days: -10 }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.patch.subscription_ends_at).toBe("2026-07-31T12:00:00.000Z");
  });

  it("extend_period rejects 0, out-of-range, and shortening into the past", () => {
    expect(action("extend_period").buildPatch(activeUser, { days: 0 }, NOW).ok).toBe(false);
    expect(action("extend_period").buildPatch(activeUser, { days: 999 }, NOW).ok).toBe(false);
    expect(action("extend_period").buildPatch(activeUser, { days: -60 }, NOW).ok).toBe(false);
  });

  it("extend_period bases an expired trial on now (not the past date)", () => {
    const expired = { ...trialUser, trial_ends_at: "2026-07-01T00:00:00.000Z" };
    const r = action("extend_period").buildPatch(expired, { days: 7 }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.patch.trial_ends_at).toBe("2026-07-17T12:00:00.000Z");
  });

  it("trial_to_paid activates with a future end date and clears comp", () => {
    const r = action("trial_to_paid").buildPatch(trialUser, { plan: "pro", until: "2026-09-01T00:00" }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.patch.subscription_status).toBe("active");
      expect(r.patch.is_comp).toBe(false);
      expect(r.patch.cancel_at_period_end).toBe(false);
    }
  });

  it("trial_to_paid rejects a past date", () => {
    const r = action("trial_to_paid").buildPatch(trialUser, { plan: "pro", until: "2026-01-01T00:00" }, NOW);
    expect(r.ok).toBe(false);
  });

  it("cancel: immediate vs at-period-end", () => {
    const now = action("cancel").buildPatch(activeUser, {}, NOW);
    expect(now.ok && now.patch.subscription_status === "cancelled").toBe(true);
    const later = action("cancel").buildPatch(activeUser, { atPeriodEnd: true }, NOW);
    expect(later.ok && later.patch.cancel_at_period_end === true).toBe(true);
  });

  it("restore pushes a fresh end date when the old one already passed", () => {
    const lapsed = { ...activeUser, subscription_status: "cancelled", subscription_ends_at: "2026-06-01T00:00:00.000Z" };
    const r = action("restore").buildPatch(lapsed, {}, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.patch.subscription_status).toBe("active");
      expect(new Date(String(r.patch.subscription_ends_at)).getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("comp_grant mirrors the grant-modal payload", () => {
    const r = action("comp_grant").buildPatch(trialUser, { plan: "business", until: "2026-10-01T00:00" }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.patch.is_comp).toBe(true);
      expect(r.patch.cancel_at_period_end).toBe(true);
      expect(r.patch.subscription_status).toBe("active");
    }
  });

  it("comp_revoke clears the grant and cancels", () => {
    const r = action("comp_revoke").buildPatch(compUser, {}, NOW);
    expect(r.ok && r.patch.is_comp === false && r.patch.subscription_status === "cancelled").toBe(true);
  });
});

describe("simulate (before → after preview)", () => {
  it("trial → active shows a price only after", () => {
    const r = action("trial_to_paid").buildPatch(trialUser, { plan: "pro", until: "2026-09-01T00:00" }, NOW);
    if (!r.ok) throw new Error("build failed");
    const { before, after } = simulate(trialUser, r.patch, NOW);
    expect(before.status).toBe("trial");
    expect(before.priceIls).toBeNull();
    expect(after.status).toBe("active");
    expect(after.priceIls).toBe(199);
  });

  it("active → cancel_scheduled via at-period-end", () => {
    const { after } = simulate(activeUser, { subscription_status: "active", cancel_at_period_end: true }, NOW);
    expect(after.status).toBe("cancel_scheduled");
  });

  it("comp grant is active but never counted as paying", () => {
    const r = action("comp_grant").buildPatch(trialUser, { plan: "business", until: "2026-10-01T00:00" }, NOW);
    if (!r.ok) throw new Error("build failed");
    const { after } = simulate(trialUser, r.patch, NOW);
    expect(after.isComp).toBe(true);
    expect(after.isPaying).toBe(false);
    expect(after.priceIls).toBeNull();
  });
});

describe("actionsForState (visibility)", () => {
  it("trial user sees conversion but not pause/restore/comp_revoke", () => {
    const ids = actionsForState(deriveSubscriptionState(trialUser, NOW)).map((a) => a.id);
    expect(ids).toContain("trial_to_paid");
    expect(ids).toContain("comp_grant");
    expect(ids).not.toContain("pause");
    expect(ids).not.toContain("restore");
    expect(ids).not.toContain("comp_revoke");
  });

  it("active user sees pause/cancel but not trial conversion", () => {
    const ids = actionsForState(deriveSubscriptionState(activeUser, NOW)).map((a) => a.id);
    expect(ids).toContain("pause");
    expect(ids).toContain("cancel");
    expect(ids).not.toContain("trial_to_paid");
  });

  it("comp user sees comp_revoke but not comp_grant", () => {
    const ids = actionsForState(deriveSubscriptionState(compUser, NOW)).map((a) => a.id);
    expect(ids).toContain("comp_revoke");
    expect(ids).not.toContain("comp_grant");
  });
});
