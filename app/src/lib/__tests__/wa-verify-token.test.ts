import { describe, it, expect, vi, afterEach } from "vitest";
import { signWaVerifyToken, verifyWaVerifyToken } from "@/lib/wa-verify-token";
import { signAdminToken, verifyAdminToken } from "@/lib/admin-auth";

afterEach(() => {
  vi.useRealTimers();
});

describe("wa-verify token — binds {user, number} for 15 minutes", () => {
  it("round-trips for the same user + number", () => {
    const t = signWaVerifyToken("user-1", "0501234567");
    expect(verifyWaVerifyToken(t, "user-1", "0501234567")).toBe(true);
  });

  it("rejects a different user (stolen token)", () => {
    const t = signWaVerifyToken("user-1", "0501234567");
    expect(verifyWaVerifyToken(t, "user-2", "0501234567")).toBe(false);
  });

  it("rejects a different number (token reuse for another number)", () => {
    const t = signWaVerifyToken("user-1", "0501234567");
    expect(verifyWaVerifyToken(t, "user-1", "0529999999")).toBe(false);
  });

  it("rejects after expiry (15 minutes)", () => {
    vi.useFakeTimers();
    const t = signWaVerifyToken("user-1", "0501234567");
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(verifyWaVerifyToken(t, "user-1", "0501234567")).toBe(false);
  });

  it("rejects tampered payloads and garbage", () => {
    const t = signWaVerifyToken("user-1", "0501234567");
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "user-2", num: "0501234567", exp: Date.now() + 60_000 }))
      .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(verifyWaVerifyToken(`${forged}.${sig}`, "user-2", "0501234567")).toBe(false);
    expect(verifyWaVerifyToken(`${payload}.AAAA`, "user-1", "0501234567")).toBe(false);
    expect(verifyWaVerifyToken("not-a-token", "user-1", "0501234567")).toBe(false);
    expect(verifyWaVerifyToken(undefined, "user-1", "0501234567")).toBe(false);
  });

  it("domain separation — wa token never validates as an admin 2FA token, and vice versa", () => {
    // Both sign with keys derived from ADMIN_SESSION_SECRET, but through
    // different derivations ("wa-verify|" prefix) — cross-acceptance would be
    // a privilege-escalation bug.
    const wa = signWaVerifyToken("user-1", "0501234567");
    expect(verifyAdminToken(wa)).toBeNull();

    const admin = signAdminToken("user-1");
    expect(verifyWaVerifyToken(admin, "user-1", "0501234567")).toBe(false);
  });
});
