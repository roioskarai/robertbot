import { describe, it, expect } from "vitest";
import { ASSISTANT_QUERIES, ASSISTANT_QUERY_IDS, getQuery } from "@/lib/admin-assistant/queries";

describe("assistant query registry", () => {
  it("has unique ids", () => {
    expect(new Set(ASSISTANT_QUERY_IDS).size).toBe(ASSISTANT_QUERY_IDS.length);
  });

  it("every query has a Hebrew label + intent description", () => {
    for (const q of ASSISTANT_QUERIES) {
      expect(q.labelHe.length, q.id).toBeGreaterThan(0);
      expect(q.descriptionForIntent.length, q.id).toBeGreaterThan(0);
    }
  });

  it("getQuery resolves known ids and rejects unknown", () => {
    expect(getQuery("mrr_summary")?.id).toBe("mrr_summary");
    expect(getQuery("__nope__")).toBeUndefined();
  });

  it("param schemas coerce and clamp out-of-range days", () => {
    const signups = getQuery("signups_count")!;
    // default applies when absent
    expect((signups.params.safeParse({}) as { success: true; data: { days: number } }).data.days).toBe(30);
    // string coercion + valid
    const ok = signups.params.safeParse({ days: "7" });
    expect(ok.success).toBe(true);
    if (ok.success) expect((ok.data as { days: number }).days).toBe(7);
    // out of range rejected
    expect(signups.params.safeParse({ days: 0 }).success).toBe(false);
    expect(signups.params.safeParse({ days: 5000 }).success).toBe(false);
  });

  it("top_bots_by_messages caps the limit at 20", () => {
    const q = getQuery("top_bots_by_messages")!;
    expect(q.params.safeParse({ limit: 21 }).success).toBe(false);
    expect(q.params.safeParse({ limit: 5 }).success).toBe(true);
  });

  it("user_lookup requires a non-trivial email string", () => {
    const q = getQuery("user_lookup")!;
    expect(q.params.safeParse({ email: "a" }).success).toBe(false);
    const ok = q.params.safeParse({ email: "  Foo@BAR.com " });
    expect(ok.success).toBe(true);
    if (ok.success) expect((ok.data as { email: string }).email).toBe("foo@bar.com");
  });

  it("low_pack_balances validates the threshold", () => {
    const q = getQuery("low_pack_balances")!;
    expect(q.params.safeParse({ threshold: -1 }).success).toBe(false);
    expect(q.params.safeParse({ threshold: 50 }).success).toBe(true);
    expect((q.params.safeParse({}) as { success: true; data: { threshold: number } }).data.threshold).toBe(50);
  });

  it("parameterless queries accept an empty object", () => {
    for (const id of ["mrr_summary", "trial_conversion", "usage_this_month", "pending_proposals"]) {
      expect(getQuery(id)!.params.safeParse({}).success, id).toBe(true);
    }
  });
});
