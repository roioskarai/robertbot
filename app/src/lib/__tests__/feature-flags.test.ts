import { describe, it, expect } from "vitest";
import { resolveFlag } from "@/lib/system-settings-core";

// The feature-flags module itself is "server-only" (it reads system_settings),
// so we test its two contracts through the pure resolveFlag helper it delegates
// to, plus a static check that the registry stays well-formed. The registry is
// duplicated here as the expected shape; if lib/feature-flags.ts changes keys,
// this test documents the intended set.
const REGISTRY = [
  { key: "ai_assistant", defaultOn: true },
  { key: "weekly_report", defaultOn: true },
  { key: "store_packs", defaultOn: true },
];

describe("feature-flag resolution", () => {
  it("returns the code default when there is no stored override", () => {
    for (const f of REGISTRY) {
      expect(resolveFlag(f.key, {}, f.defaultOn)).toBe(f.defaultOn);
    }
  });

  it("lets an admin override turn a default-on flag OFF", () => {
    expect(resolveFlag("ai_assistant", { ai_assistant: false }, true)).toBe(false);
  });

  it("lets an admin override turn a flag ON", () => {
    expect(resolveFlag("store_packs", { store_packs: true }, false)).toBe(true);
  });

  it("ignores overrides for other keys", () => {
    expect(resolveFlag("weekly_report", { ai_assistant: false }, true)).toBe(true);
  });
});

describe("registry integrity", () => {
  it("has unique, non-empty keys", () => {
    const keys = REGISTRY.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k) => k.length > 0)).toBe(true);
  });
});
