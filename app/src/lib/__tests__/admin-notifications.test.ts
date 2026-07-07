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
});
