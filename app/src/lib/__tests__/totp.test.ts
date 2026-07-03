import { describe, it, expect } from "vitest";
import { authenticator } from "otplib";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/totp";

describe("totp", () => {
  it("verifies a currently valid code", () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotp(code, secret)).toBe(true);
  });

  it("rejects invalid codes", () => {
    const secret = generateTotpSecret();
    // non-numeric / empty tokens are guaranteed-invalid (a random 6-digit
    // code could collide with the current window once in ~10^6 runs)
    expect(verifyTotp("abcdef", secret)).toBe(false);
    expect(verifyTotp("", secret)).toBe(false);
  });

  it("builds a well-formed otpauth URI", () => {
    const uri = totpUri("JBSWY3DPEHPK3PXP", "owner@example.com");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("Robert%20Admin");
    expect(uri).toContain("JBSWY3DPEHPK3PXP");
  });

  it("tolerates surrounding whitespace in the code", () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotp(`  ${code}  `, secret)).toBe(true);
  });
});
