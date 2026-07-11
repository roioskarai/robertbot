import { describe, it, expect } from "vitest";
import { mergeTimeline, diffSummaryHe } from "@/lib/admin-timeline";

const T1 = "2026-07-01T10:00:00.000Z";
const T2 = "2026-07-05T10:00:00.000Z";
const T3 = "2026-07-09T10:00:00.000Z";

describe("mergeTimeline", () => {
  it("merges all sources sorted newest-first", () => {
    const events = mergeTimeline({
      user: { created_at: T1, last_login_at: T3 },
      paymentEvents: [{ event_type: "subscription_active", created_at: T2 }],
      auditEntries: [{ action: "subscription.change", created_at: T2 }],
      agentRuns: [{ agent: "retention", status: "success", summary: "טיוטה", created_at: T1 }],
    });
    expect(events).toHaveLength(5);
    expect(events[0].kind).toBe("login");
    expect(events[events.length - 1].ts).toBe(T1);
    const timestamps = events.map((e) => Date.parse(e.ts));
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
  });

  it("renders registration + payments even with no audit entries (pre-migration)", () => {
    const events = mergeTimeline({
      user: { created_at: T1, last_login_at: null },
      paymentEvents: [{ event_type: "pack_purchased", created_at: T2 }],
      auditEntries: [],
    });
    expect(events).toHaveLength(2);
    expect(events[0].labelHe).toContain("חבילת הודעות");
    expect(events[1].kind).toBe("registration");
  });

  it("labels unknown payment types generically and skips invalid timestamps", () => {
    const events = mergeTimeline({
      user: {},
      paymentEvents: [
        { event_type: "weird_event", created_at: T1 },
        { event_type: "subscription_active", created_at: "not-a-date" },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0].labelHe).toContain("weird_event");
  });

  it("attaches diff + note details to admin events", () => {
    const [e] = mergeTimeline({
      user: {},
      auditEntries: [{
        action: "subscription.change",
        created_at: T1,
        diff: { before: { plan: "basic" }, after: { plan: "pro" } },
        meta: { note: "שדרוג ידני" },
      }],
    });
    expect(e.kind).toBe("admin");
    expect(e.detailHe).toContain("basic");
    expect(e.detailHe).toContain("pro");
    expect(e.detailHe).toContain("שדרוג ידני");
  });

  it("marks failed agent runs", () => {
    const [e] = mergeTimeline({
      user: {},
      agentRuns: [{ agent: "conversation-analyst", status: "error", summary: null, created_at: T1 }],
    });
    expect(e.labelHe).toContain("שגיאה");
  });
});

describe("diffSummaryHe", () => {
  it("uses Hebrew field labels and formats booleans/dates", () => {
    const s = diffSummaryHe({
      before: { is_suspended: false, subscription_ends_at: null },
      after: { is_suspended: true, subscription_ends_at: "2026-08-01T00:00:00.000Z" },
    });
    expect(s).toContain("חסום");
    expect(s).toContain("כן");
    expect(s).toContain("לא");
  });

  it("returns empty string for missing diff", () => {
    expect(diffSummaryHe(undefined)).toBe("");
    expect(diffSummaryHe(null)).toBe("");
  });
});
