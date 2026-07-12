import "server-only";

// Operational system config (maintenance mode + feature flags), backed by the
// system_settings key-value table (migration 0013). Reads are cached via
// unstable_cache (tag SYSTEM_TAG) and revalidated on every write, mirroring
// lib/site/content.ts. Feature-detects the table (isMissingTableError) so the
// app runs on safe defaults — maintenance OFF, flags empty — before 0013 is
// applied. Writes always go through the service-role admin client after
// requireAdmin() in the route + an admin-audit entry.

import { unstable_cache, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { isMissingTableError } from "@/lib/admin-audit-core";
import { parseMaintenanceValue, coerceFlagMap } from "@/lib/system-settings-core";
import { getSessionUser } from "@/lib/auth";

export const SYSTEM_TAG = "system-settings";

export interface MaintenanceState {
  enabled: boolean;
  message?: string;
  etaText?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

const MAINTENANCE_OFF: MaintenanceState = { enabled: false };

export type WriteResult =
  | { ok: true }
  | { ok: false; missingTable?: boolean; error: string };

interface KeyRow {
  value: Record<string, unknown>;
  updated_at?: string | null;
  updated_by?: string | null;
}

/** Read one system_settings row. Returns null in demo mode / missing table / error. */
async function readKey(key: string): Promise<KeyRow | null> {
  if (isDemoMode()) return null;
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("system_settings")
      .select("value, updated_at, updated_by")
      .eq("key", key)
      .maybeSingle();
    if (error) {
      if (!isMissingTableError(error)) console.error("[system-settings] read error:", error.message);
      return null;
    }
    return (data as KeyRow) ?? null;
  } catch (e) {
    console.error("[system-settings] read threw:", e instanceof Error ? e.message : e);
    return null;
  }
}

// ── Maintenance ──────────────────────────────────────────────
const loadMaintenance = unstable_cache(
  async (): Promise<MaintenanceState> => {
    const row = await readKey("maintenance");
    if (!row) return MAINTENANCE_OFF;
    return {
      ...parseMaintenanceValue(row.value),
      updatedAt: row.updated_at ?? null,
      updatedBy: row.updated_by ?? null,
    };
  },
  ["system-maintenance"],
  // Tag revalidation makes a toggle instant; the short time-based revalidate is
  // a safety net so the flag self-heals within seconds even if a tag
  // invalidation is ever missed across serverless instances.
  { tags: [SYSTEM_TAG], revalidate: 15 },
);

/** Current maintenance state (cached). Safe default: OFF. */
export function getMaintenance(): Promise<MaintenanceState> {
  return loadMaintenance();
}

// ── Feature flags (raw stored map; the registry lives in lib/feature-flags.ts) ──
const loadFeatureFlags = unstable_cache(
  async (): Promise<Record<string, boolean>> => {
    const row = await readKey("feature_flags");
    return coerceFlagMap(row?.value);
  },
  ["system-feature-flags"],
  { tags: [SYSTEM_TAG], revalidate: 30 },
);

/** Raw stored flag overrides (cached). Absent key → use the registry default. */
export function getStoredFlags(): Promise<Record<string, boolean>> {
  return loadFeatureFlags();
}

/** Invalidate all cached system config after a write (mirrors revalidateSite). */
export function revalidateSystem(): void {
  revalidateTag(SYSTEM_TAG, "max");
}

// ── Writes (service-role; callers must requireAdmin first) ──
async function writeKey(
  key: string,
  value: Record<string, unknown>,
  updatedBy?: string | null,
): Promise<WriteResult> {
  if (isDemoMode()) return { ok: false, error: "לא זמין במצב דמו" };
  try {
    const db = createAdminClient();
    const { error } = await db.from("system_settings").upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by: updatedBy ?? null },
      { onConflict: "key" },
    );
    if (error) {
      if (isMissingTableError(error))
        return { ok: false, missingTable: true, error: "יש להריץ קודם את מיגרציה 0013" };
      return { ok: false, error: error.message };
    }
    revalidateSystem();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה" };
  }
}

export function setMaintenance(state: MaintenanceState, updatedBy?: string | null): Promise<WriteResult> {
  return writeKey(
    "maintenance",
    { enabled: state.enabled, message: state.message ?? "", etaText: state.etaText ?? "" },
    updatedBy,
  );
}

/** Merge flag overrides over the currently-stored map. */
export async function setFlagOverrides(
  partial: Record<string, boolean>,
  updatedBy?: string | null,
): Promise<WriteResult> {
  const current = await getStoredFlags();
  return writeKey("feature_flags", { ...current, ...partial }, updatedBy);
}

/**
 * Public page guard: when maintenance is ON, send non-admins to /maintenance.
 * Admins pass through (session role === 'admin'). No-op when maintenance is OFF,
 * so the common path costs only the cached getMaintenance() read.
 * Call at the top of customer-facing server pages/layouts — never under /admin.
 */
export async function guardPublicMaintenance(): Promise<void> {
  const m = await getMaintenance();
  if (!m.enabled) return;
  try {
    const session = await getSessionUser();
    if (session?.profile?.role === "admin") return;
  } catch {
    // session lookup failed → treat as non-admin, fall through to maintenance
  }
  redirect("/maintenance");
}
