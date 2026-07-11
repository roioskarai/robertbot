import { describe, it, expect } from "vitest";
import { diffOf, isMissingTableError, AUDIT_ACTION_HE } from "@/lib/admin-audit-core";

describe("diffOf", () => {
  it("returns only changed keys", () => {
    const before = { plan: "basic", subscription_status: "trial", pack_balance: 0 };
    const after = { plan: "pro", subscription_status: "trial", pack_balance: 0 };
    const d = diffOf(before, after, ["plan", "subscription_status", "pack_balance"]);
    expect(d.before).toEqual({ plan: "basic" });
    expect(d.after).toEqual({ plan: "pro" });
  });

  it("treats undefined and null as equal (no phantom changes)", () => {
    const d = diffOf({ comp_note: undefined }, { comp_note: null }, ["comp_note"]);
    expect(d.before).toEqual({});
    expect(d.after).toEqual({});
  });

  it("captures a null -> value transition", () => {
    const d = diffOf({ subscription_ends_at: null }, { subscription_ends_at: "2026-08-01T00:00:00.000Z" }, ["subscription_ends_at"]);
    expect(d.before).toEqual({ subscription_ends_at: null });
    expect(d.after).toEqual({ subscription_ends_at: "2026-08-01T00:00:00.000Z" });
  });

  it("ignores keys not listed", () => {
    const d = diffOf({ plan: "basic", email: "a@b.c" }, { plan: "pro", email: "x@y.z" }, ["plan"]);
    expect(Object.keys(d.after)).toEqual(["plan"]);
  });

  it("compares booleans and numbers strictly", () => {
    const d = diffOf({ is_suspended: false, pack_balance: 100 }, { is_suspended: true, pack_balance: 100 }, ["is_suspended", "pack_balance"]);
    expect(d.after).toEqual({ is_suspended: true });
  });
});

describe("isMissingTableError", () => {
  it("matches Postgres undefined_table (42P01)", () => {
    expect(isMissingTableError({ code: "42P01", message: "x" })).toBe(true);
  });

  it("matches PostgREST schema-cache miss (PGRST205)", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "x" })).toBe(true);
  });

  it("matches the PostgREST message shape", () => {
    expect(isMissingTableError({ message: "Could not find the table 'public.admin_audit_log' in the schema cache" })).toBe(true);
  });

  it("matches the raw Postgres message shape", () => {
    expect(isMissingTableError({ message: 'relation "admin_audit_log" does not exist' })).toBe(true);
  });

  it("rejects unrelated errors and non-objects", () => {
    expect(isMissingTableError({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError("boom")).toBe(false);
  });
});

describe("AUDIT_ACTION_HE", () => {
  it("covers the wired batch-1 actions", () => {
    for (const action of [
      "subscription.change", "subscription.comp_grant", "user.suspend", "user.unsuspend",
      "user.role_change", "user.update", "auth.login", "auth.login_failed",
      "auth.password_change", "auth.2fa_enable", "auth.2fa_verify_failed", "agent.trigger",
    ]) {
      expect(AUDIT_ACTION_HE[action], action).toBeTruthy();
    }
  });
});
