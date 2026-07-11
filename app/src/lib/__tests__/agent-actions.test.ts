import { describe, it, expect } from "vitest";
import { transitionAction, isApplyable, isoWeekKey } from "@/lib/agents/actions";
import type { ProposedAction } from "@/lib/types";

const mk = (type: string, status: ProposedAction["status"]): ProposedAction => ({
  type, status, label: "x", payload: {}, target: "t1",
});

describe("transitionAction", () => {
  it("pending → approved", () => {
    const r = transitionAction([mk("prompt_improvement", "pending")], 0, "approve");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action.status).toBe("approved");
  });

  it("pending → dismissed", () => {
    const r = transitionAction([mk("retention_offer", "pending")], 0, "dismiss");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action.status).toBe("dismissed");
  });

  it("approved → applied for applyable types only", () => {
    const ok = transitionAction([mk("faq_addition", "approved")], 0, "apply");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.action.status).toBe("applied");

    const offer = transitionAction([mk("retention_offer", "approved")], 0, "apply");
    expect(offer.ok).toBe(false);
  });

  it("rejects illegal transitions", () => {
    expect(transitionAction([mk("faq_addition", "pending")], 0, "apply").ok).toBe(false);   // must approve first
    expect(transitionAction([mk("faq_addition", "applied")], 0, "approve").ok).toBe(false); // terminal
    expect(transitionAction([mk("faq_addition", "dismissed")], 0, "approve").ok).toBe(false);
    expect(transitionAction([mk("faq_addition", "approved")], 0, "approve").ok).toBe(false);
    expect(transitionAction([], 0, "approve").ok).toBe(false);                              // out of range
  });

  it("does not mutate the input array and only touches the target index", () => {
    const input = [mk("faq_addition", "pending"), mk("retention_offer", "pending")];
    const r = transitionAction(input, 0, "approve");
    expect(input[0].status).toBe("pending");
    if (r.ok) {
      expect(r.actions[0].status).toBe("approved");
      expect(r.actions[1].status).toBe("pending");
    }
  });

  it("isApplyable matches the whitelist exactly", () => {
    expect(isApplyable("prompt_improvement")).toBe(true);
    expect(isApplyable("faq_addition")).toBe(true);
    expect(isApplyable("retention_offer")).toBe(false);
    expect(isApplyable("anything_else")).toBe(false);
  });
});

describe("isoWeekKey", () => {
  it("computes ISO weeks incl. year boundaries", () => {
    expect(isoWeekKey(new Date("2026-07-11T00:00:00Z"))).toBe("2026-W28");
    // 2026-01-01 is a Thursday → week 1 of 2026.
    expect(isoWeekKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
    // 2027-01-01 is a Friday → still week 53 of 2026.
    expect(isoWeekKey(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
  });

  it("is stable across a whole ISO week (Mon–Sun dedup key)", () => {
    const mon = isoWeekKey(new Date("2026-07-06T08:00:00Z")); // Monday
    const sun = isoWeekKey(new Date("2026-07-12T23:00:00Z")); // same ISO week's Sunday
    expect(mon).toBe(sun);
    // The previous Sunday belongs to the PREVIOUS ISO week.
    expect(isoWeekKey(new Date("2026-07-05T08:00:00Z"))).toBe("2026-W27");
  });
});
