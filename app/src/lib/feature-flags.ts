import "server-only";

// Feature-flag registry — the SINGLE SOURCE OF TRUTH for which flags exist,
// their Hebrew labels, and their code-defined defaults. The admin can only
// toggle flags that appear here (no arbitrary keys); the stored override in
// system_settings['feature_flags'] wins over the default. Every gate is
// fail-safe: an unknown key is treated as OFF.

import { getStoredFlags } from "@/lib/system-settings";
import { resolveFlag } from "@/lib/system-settings-core";

export interface FeatureFlagDef {
  key: string;
  labelHe: string;
  descHe: string;
  defaultOn: boolean;
}

export const FEATURE_FLAGS: FeatureFlagDef[] = [
  {
    key: "ai_assistant",
    labelHe: "עוזר AI בפאנל",
    descHe: "מאפשר לשאול את עוזר ה-AI שאלות על המערכת. כיבוי חוסם את דף העוזר ואת ה-API שלו.",
    defaultOn: true,
  },
  {
    key: "weekly_report",
    labelHe: "דוח אסטרטגי שבועי",
    descHe: "שולח דוח שבועי לבעלים במייל (יום ראשון). כיבוי מדלג על הריצה השבועית.",
    defaultOn: true,
  },
  {
    key: "store_packs",
    labelHe: "מכירת חבילות הודעות",
    descHe: "מאפשר ללקוחות פעילים לרכוש חבילות הודעות בחנות. כיבוי חוסם רכישת חבילות.",
    defaultOn: true,
  },
];

const BY_KEY = new Map(FEATURE_FLAGS.map((f) => [f.key, f]));

export function isKnownFlag(key: string): boolean {
  return BY_KEY.has(key);
}

/** Effective on/off for a flag (stored override → code default). Unknown → OFF. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const def = BY_KEY.get(key);
  if (!def) return false;
  const overrides = await getStoredFlags();
  return resolveFlag(key, overrides, def.defaultOn);
}

export interface FlagState extends FeatureFlagDef {
  enabled: boolean;
}

/** Every registry flag with its effective state — for the admin UI. */
export async function flagStates(): Promise<FlagState[]> {
  const overrides = await getStoredFlags();
  return FEATURE_FLAGS.map((f) => ({ ...f, enabled: resolveFlag(f.key, overrides, f.defaultOn) }));
}
