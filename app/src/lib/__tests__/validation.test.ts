import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  normalizePhone,
  isValidPhoneIL,
  LIMITS,
  MAX_WEBHOOK_BYTES,
  declaredBodyTooLarge,
} from "@/lib/validation";

describe("isValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidEmail("dana@example.co.il")).toBe(true);
  });
  it("rejects a missing tld", () => {
    expect(isValidEmail("a@b")).toBe(false);
  });
  it("rejects spaces and empties", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
  it("trims surrounding whitespace", () => {
    expect(isValidEmail("  dana@example.com  ")).toBe(true);
  });
});

describe("normalizePhone", () => {
  it("maps +972 to a leading 0", () => {
    expect(normalizePhone("+972501234567")).toBe("0501234567");
  });
  it("maps bare 972 to a leading 0", () => {
    expect(normalizePhone("972501234567")).toBe("0501234567");
  });
  it("strips separators", () => {
    expect(normalizePhone("050-123 4567")).toBe("0501234567");
  });
});

describe("isValidPhoneIL", () => {
  it("accepts a mobile number", () => {
    expect(isValidPhoneIL("0501234567")).toBe(true);
  });
  it("accepts an international-format mobile", () => {
    expect(isValidPhoneIL("+972-50-123-4567")).toBe(true);
  });
  it("accepts a 9-digit landline", () => {
    expect(isValidPhoneIL("039876543")).toBe(true);
  });
  it("rejects short and foreign numbers", () => {
    expect(isValidPhoneIL("12345")).toBe(false);
    expect(isValidPhoneIL("+14155550100")).toBe(false);
  });
});

describe("declaredBodyTooLarge", () => {
  const req = (len?: string) =>
    new Request("https://x.test", {
      method: "POST",
      headers: len ? { "content-length": len } : {},
    });

  it("passes small and missing content-length", () => {
    expect(declaredBodyTooLarge(req("1024"))).toBe(false);
    expect(declaredBodyTooLarge(req())).toBe(false);
  });
  it("rejects a payload over the cap", () => {
    expect(declaredBodyTooLarge(req(String(MAX_WEBHOOK_BYTES + 1)))).toBe(true);
  });
  it("keeps LIMITS sane", () => {
    expect(LIMITS.name).toBeGreaterThan(0);
    expect(MAX_WEBHOOK_BYTES).toBeGreaterThan(100_000);
  });
});
