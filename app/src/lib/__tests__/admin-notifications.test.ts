import { describe, it, expect } from "vitest";
import { deriveNotifications } from "@/lib/admin-notifications";

const now = new Date("2026-07-07T12:00:00Z");
const nowMs = now.getTime();
const iso = (offsetMs: number) => new Date(nowMs + offsetMs).toISOString();
const DAY = 86_400_000;

describe("deriveNotifications", () => {
  it("flags a trial ending within 48h, not one ending in 5 days", () => {
    const users = [
      { id: "u1", email: "soon@x.com", subscription_status: "trial", trial_ends_at: iso(1 * DAY) },
      { id: "u2", email: "later@x.com", subscription_status: "trial", trial_ends_at: iso(5 * DAY) },
    ];
    const n = deriveNotifications(users, [], now);
    const trials = n.filter((x) => x.id.startsWith("trial-ending"));
    expect(trials).toHaveLength(1);
    expect(trials[0].title).toContain("soon@x.com");
  });

  it("flags a comp expiring within 7 days only when active + is_comp", () => {
    const users = [
      { id: "c1", email: "comp@x.com", subscription_status: "active", is_comp: true, subscription_ends_at: iso(3 * DAY) },
      { id: "c2", email: "paying@x.com", subscription_status: "active", is_comp: false, subscription_ends_at: iso(3 * DAY) },
      { id: "c3", email: "far@x.com", subscription_status: "active", is_comp: true, subscription_ends_at: iso(20 * DAY) },
    ];
    const n = deriveNotifications(users, [], now);
    const comps = n.filter((x) => x.id.startsWith("comp-expiring"));
    expect(comps).toHaveLength(1);
    expect(comps[0].title).toContain("comp@x.com");
  });

  it("flags agent failures in the last 24h and sorts errors first", () => {
    const runs = [
      { id: "r1", agent: "retention", status: "error", created_at: iso(-2 * 3600_000) },
      { id: "r2", agent: "analyst", status: "error", created_at: iso(-2 * DAY) }, // too old
      { id: "r3", agent: "analyst", status: "success", created_at: iso(-1 * 3600_000) },
    ];
    const users = [{ id: "n1", email: "new@x.com", subscription_status: "trial", trial_ends_at: iso(1 * DAY), created_at: iso(-3600_000) }];
    const n = deriveNotifications(users, runs, now);
    const fails = n.filter((x) => x.id.startsWith("agent-failed"));
    expect(fails).toHaveLength(1);
    expect(n[0].severity).toBe("error"); // most-severe first
  });

  it("aggregates new signups in the last 24h into one item", () => {
    const users = [
      { id: "a", email: "a@x.com", created_at: iso(-1 * 3600_000) },
      { id: "b", email: "b@x.com", created_at: iso(-5 * 3600_000) },
      { id: "c", email: "c@x.com", created_at: iso(-3 * DAY) }, // too old
    ];
    const n = deriveNotifications(users, [], now);
    const newUsers = n.filter((x) => x.id.startsWith("new-users"));
    expect(newUsers).toHaveLength(1);
    expect(newUsers[0].title).toContain("2 משתמשים");
  });

  it("returns nothing for a quiet system", () => {
    expect(deriveNotifications([], [], now)).toEqual([]);
  });

  // ── batch-4 alert types ──────────────────────────────────────

  it("flags an orphan payment (paid but not active) and an unmatched payment", () => {
    const users = [
      { id: "p1", email: "paid@x.com", subscription_status: "trial" },
      { id: "p2", email: "fine@x.com", subscription_status: "active" },
    ];
    const n = deriveNotifications(users, [], now, {
      paymentEvents: [
        { event_type: "subscription_active", user_id: "p1", created_at: iso(-1 * DAY) },
        { event_type: "subscription_active", user_id: "p2", created_at: iso(-1 * DAY) }, // healthy
        { event_type: "pack_purchased", user_id: null, created_at: iso(-2 * DAY) },      // unmatched
        { event_type: "subscription_cancelled", user_id: "p1", created_at: iso(-1 * DAY) }, // ignored type
        { event_type: "subscription_active", user_id: "p1", created_at: iso(-10 * DAY) },   // too old
      ],
    });
    const orphans = n.filter((x) => x.id.startsWith("orphan-payment"));
    expect(orphans).toHaveLength(2);
    expect(orphans.some((x) => x.title.includes("paid@x.com"))).toBe(true);
    expect(orphans.every((x) => x.severity === "error")).toBe(true);
  });

  it("flags a signup drop only when the previous average is meaningful", () => {
    // 16 signups spread over the previous 4 weeks (avg 4/week), 1 this week.
    const olds = Array.from({ length: 16 }, (_, i) => ({
      id: `o${i}`, email: `o${i}@x.com`, created_at: iso(-(8 + (i % 27)) * DAY),
    }));
    const drop = deriveNotifications([...olds, { id: "n", email: "n@x.com", created_at: iso(-1 * DAY) }], [], now);
    expect(drop.some((x) => x.id.startsWith("signup-drop"))).toBe(true);

    // Tiny history (avg < 3) → never fires.
    const tiny = deriveNotifications(
      [{ id: "o", email: "o@x.com", created_at: iso(-10 * DAY) }], [], now,
    );
    expect(tiny.some((x) => x.id.startsWith("signup-drop"))).toBe(false);
  });

  it("aggregates ≥3 failures of the same agent within 72h", () => {
    const runs = [
      { id: "f1", agent: "retention", status: "error", created_at: iso(-10 * 3600_000) },
      { id: "f2", agent: "retention", status: "error", created_at: iso(-30 * 3600_000) },
      { id: "f3", agent: "retention", status: "error", created_at: iso(-60 * 3600_000) },
      { id: "f4", agent: "analyst", status: "error", created_at: iso(-10 * 3600_000) }, // only 1
    ];
    const n = deriveNotifications([], runs, now);
    const repeats = n.filter((x) => x.id.startsWith("agent-repeat-failure"));
    expect(repeats).toHaveLength(1);
    expect(repeats[0].title).toContain("retention");
    expect(repeats[0].title).toContain("3");
  });

  it("aggregates dormant trials (>48h, never logged in)", () => {
    const users = [
      { id: "d1", email: "d1@x.com", subscription_status: "trial", created_at: iso(-3 * DAY), last_login_at: null },
      { id: "d2", email: "d2@x.com", subscription_status: "trial", created_at: iso(-4 * DAY), last_login_at: null },
      { id: "d3", email: "d3@x.com", subscription_status: "trial", created_at: iso(-1 * DAY), last_login_at: null },  // too fresh
      { id: "d4", email: "d4@x.com", subscription_status: "trial", created_at: iso(-3 * DAY), last_login_at: iso(-1 * DAY) }, // logged in
    ];
    const n = deriveNotifications(users, [], now);
    const dormant = n.filter((x) => x.id.startsWith("dormant-trials"));
    expect(dormant).toHaveLength(1);
    expect(dormant[0].title).toContain("2");
  });

  it("flags webhook signature failures only at ≥5 in 24h", () => {
    const mk = (count: number, ageMs: number) =>
      Array.from({ length: count }, () => ({
        action: "security.webhook_signature_failed", created_at: iso(ageMs),
      }));
    const five = deriveNotifications([], [], now, { securityEvents: mk(5, -3600_000) });
    expect(five.some((x) => x.id.startsWith("webhook-sig-failures"))).toBe(true);

    const four = deriveNotifications([], [], now, { securityEvents: mk(4, -3600_000) });
    expect(four.some((x) => x.id.startsWith("webhook-sig-failures"))).toBe(false);

    const stale = deriveNotifications([], [], now, { securityEvents: mk(9, -2 * DAY) });
    expect(stale.some((x) => x.id.startsWith("webhook-sig-failures"))).toBe(false);
  });
});
