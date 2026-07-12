import { describe, it, expect } from "vitest";
import { growIdempotencyKey } from "../payments/grow-provider";

// The Grow webhook idempotency key must be per-charge. recurringId is stable
// across monthly renewals, so it may only be used when scoped to a period —
// otherwise renewals #2+ get deduped (claimEvent) and a paying customer loses
// service when the cron sees an un-extended subscription_ends_at.
describe("growIdempotencyKey", () => {
  const now = new Date("2026-07-12T00:00:00Z");

  it("prefers the per-charge id (transactionId/asmachta) when present", () => {
    expect(growIdempotencyKey("TXN-123", "REC-999", now)).toBe("TXN-123");
  });

  it("scopes a stable recurringId to the current month", () => {
    expect(growIdempotencyKey("", "REC-999", now)).toBe("REC-999:2026-07");
  });

  it("gives distinct keys for the same recurringId in different months", () => {
    const jul = growIdempotencyKey("", "REC-999", new Date("2026-07-12T00:00:00Z"));
    const aug = growIdempotencyKey("", "REC-999", new Date("2026-08-12T00:00:00Z"));
    expect(jul).not.toBe(aug);
  });

  it("returns null when nothing identifies the charge", () => {
    expect(growIdempotencyKey("", "", now)).toBeNull();
  });
});
