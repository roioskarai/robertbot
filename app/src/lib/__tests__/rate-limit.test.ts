import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit, rateLimit, clientKey } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit (generic keyed limiter)", () => {
  it("allows up to max within a window, then blocks", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    expect(rateLimit(key, 5, 60_000).allowed).toBe(false);
  });

  it("resets after the window passes", () => {
    vi.useFakeTimers();
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 1_000);
    expect(rateLimit(key, 3, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit(key, 3, 1_000).allowed).toBe(true);
  });

  it("counts down remaining", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(0);
  });

  it("keeps keys independent", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});

describe("checkRateLimit (per-bot message limiter)", () => {
  it("allows a burst up to the per-minute cap (20)", () => {
    const botId = `bot-${Math.random()}`;
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(botId).allowed).toBe(true);
    }
    expect(checkRateLimit(botId).allowed).toBe(false);
  });
});

describe("clientKey", () => {
  it("takes the first x-forwarded-for entry", () => {
    const req = new Request("https://x.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientKey(req)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip, then 'unknown'", () => {
    const real = new Request("https://x.test", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(clientKey(real)).toBe("9.9.9.9");
    expect(clientKey(new Request("https://x.test"))).toBe("unknown");
  });
});
