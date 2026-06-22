import "server-only";

// Server helpers shared by the Website Builder admin API routes.

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS } from "./defaults";
import { PRIMARY_DOMAIN } from "./defaults";

type Db = ReturnType<typeof createAdminClient>;

/** Ensure the single primary site + its settings row exist; returns site id.
 *  Idempotent — safe to call from any admin route. */
export async function ensurePrimarySite(db: Db): Promise<string> {
  const { data: existing } = await db
    .from("sites").select("id").eq("is_primary", true).maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await db
    .from("sites")
    .insert({ domain: PRIMARY_DOMAIN, name: "Robert", is_primary: true })
    .select("id").single();
  if (error || !created) throw new Error(error?.message ?? "failed to create site");

  await db.from("site_settings").insert({
    site_id: created.id,
    draft_doc: DEFAULT_SETTINGS,
    published_doc: DEFAULT_SETTINGS,
  });
  return created.id;
}

export interface AuditEntry {
  site_id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type?: string;
  entity_id?: string;
  diff?: Record<string, unknown> | null;
}

/** Append an audit-log row. Never throws (logging must not break the action). */
export async function logAudit(db: Db, entry: AuditEntry): Promise<void> {
  try {
    await db.from("audit_log").insert(entry);
  } catch {
    /* swallow */
  }
}
