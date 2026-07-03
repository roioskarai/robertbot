import { describe, it, expect, beforeEach, afterEach } from "vitest";

// crypto.ts reads env at call time, so we can flip env per test and
// re-import once at the top.
import { encryptSecret, decryptSecret, hasEncryptionKey } from "@/lib/crypto";

const ORIGINAL = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

beforeEach(() => {
  setEnv({
    WA_TOKEN_ENC_KEY: "test-key-for-unit-tests",
    NEXT_PUBLIC_SUPABASE_URL: "https://real-project.supabase.co",
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("encryptSecret / decryptSecret", () => {
  it("roundtrips Hebrew + ascii plaintext", () => {
    const secret = "טוקן-סודי EAAG1234!@#";
    const stored = encryptSecret(secret);
    expect(stored).not.toContain(secret);
    expect(stored.startsWith("v1:")).toBe(true);
    expect(decryptSecret(stored)).toBe(secret);
  });

  it("produces a different ciphertext per call (fresh IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("passes legacy plaintext through decrypt unchanged", () => {
    expect(decryptSecret("plain-legacy-token")).toBe("plain-legacy-token");
  });

  it("fails closed without a key outside demo mode", () => {
    setEnv({ WA_TOKEN_ENC_KEY: undefined });
    expect(hasEncryptionKey()).toBe(false);
    expect(() => encryptSecret("x")).toThrow();
  });

  it("passes through without a key in demo mode", () => {
    setEnv({
      WA_TOKEN_ENC_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
    });
    expect(encryptSecret("x")).toBe("x");
  });

  it("rejects a tampered ciphertext (GCM auth)", () => {
    const stored = encryptSecret("attack-me");
    const parts = stored.split(":");
    // flip a byte in the ciphertext segment
    const data = Buffer.from(parts[3], "base64");
    data[0] = data[0] ^ 0xff;
    parts[3] = data.toString("base64");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });
});
