// Pure, dependency-free helpers for system_settings parsing. Kept out of
// lib/system-settings.ts (which is "server-only") so unit tests and any
// client code can import them. Mirrors the admin-audit-core split.

export interface MaintenanceValue {
  enabled: boolean;
  message?: string;
  etaText?: string;
}

/** Coerce a stored `maintenance` JSONB value into a safe, typed shape. */
export function parseMaintenanceValue(value: unknown): MaintenanceValue {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    enabled: Boolean(v.enabled),
    message: typeof v.message === "string" && v.message ? v.message : undefined,
    etaText: typeof v.etaText === "string" && v.etaText ? v.etaText : undefined,
  };
}

/** Coerce a stored `feature_flags` JSONB value into a boolean map. */
export function coerceFlagMap(value: unknown): Record<string, boolean> {
  const v = (value ?? {}) as Record<string, unknown>;
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(v)) out[k] = Boolean(val);
  return out;
}

/**
 * Effective on/off for a flag: the stored override wins; otherwise the
 * code-defined default. Central so the UI and server agree.
 */
export function resolveFlag(
  key: string,
  overrides: Record<string, boolean>,
  defaultOn: boolean,
): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key]! : defaultOn;
}
