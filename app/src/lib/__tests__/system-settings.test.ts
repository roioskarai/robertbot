import { describe, it, expect } from "vitest";
import { parseMaintenanceValue, coerceFlagMap, resolveFlag } from "@/lib/system-settings-core";
import { AUDIT_ACTION_HE } from "@/lib/admin-audit-core";

describe("parseMaintenanceValue", () => {
  it("defaults to OFF for empty/missing input", () => {
    expect(parseMaintenanceValue(undefined)).toEqual({ enabled: false });
    expect(parseMaintenanceValue({})).toEqual({ enabled: false });
    expect(parseMaintenanceValue(null)).toEqual({ enabled: false });
  });

  it("coerces enabled to a boolean and keeps non-empty text", () => {
    expect(parseMaintenanceValue({ enabled: 1, message: "חוזרים", etaText: "שעה" })).toEqual({
      enabled: true,
      message: "חוזרים",
      etaText: "שעה",
    });
  });

  it("drops empty strings so the UI shows its own defaults", () => {
    expect(parseMaintenanceValue({ enabled: true, message: "", etaText: "" })).toEqual({ enabled: true });
  });
});

describe("coerceFlagMap", () => {
  it("returns {} for empty input", () => {
    expect(coerceFlagMap(undefined)).toEqual({});
    expect(coerceFlagMap(null)).toEqual({});
  });

  it("coerces every value to a boolean", () => {
    expect(coerceFlagMap({ a: true, b: 0, c: 1, d: false })).toEqual({ a: true, b: false, c: true, d: false });
  });
});

describe("resolveFlag", () => {
  it("uses the stored override when present (even when false)", () => {
    expect(resolveFlag("x", { x: false }, true)).toBe(false);
    expect(resolveFlag("x", { x: true }, false)).toBe(true);
  });

  it("falls back to the code default when no override exists", () => {
    expect(resolveFlag("x", {}, true)).toBe(true);
    expect(resolveFlag("x", { y: true }, false)).toBe(false);
  });
});

describe("AUDIT_ACTION_HE — system actions", () => {
  it("labels the new system/maintenance/flag actions", () => {
    for (const a of ["system.maintenance_on", "system.maintenance_off", "system.flag_toggle", "site.restore_defaults"]) {
      expect(AUDIT_ACTION_HE[a], a).toBeTruthy();
    }
  });
});
