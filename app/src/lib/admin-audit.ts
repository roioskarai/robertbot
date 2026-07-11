import "server-only";

// Global admin audit trail (admin_audit_log, migration 0011) — write side.
//
// Mirrors the CMS logAudit() philosophy (lib/site/admin.ts): logging must
// never break the action it documents. Until migration 0011 is applied the
// table doesn't exist — writes are swallowed (with one console.error so the
// gap is visible in server logs) and readers feature-detect via
// isMissingTableError() from lib/admin-audit-core.ts.

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminAuditEntry } from "@/lib/admin-audit-core";

export type { AdminAuditEntry } from "@/lib/admin-audit-core";
export { diffOf, isMissingTableError } from "@/lib/admin-audit-core";

type Db = ReturnType<typeof createAdminClient>;

// Local copy of the demo-mode check (agents/runner.ts) — kept inline so admin
// auth routes don't pull the Anthropic SDK just to write an audit row.
function adminDbConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return Boolean(url) && !url.includes("placeholder") && Boolean(key) && !key.includes("placeholder");
}

/** Append an admin-audit row. Never throws (demo mode / missing table are no-ops). */
export async function logAdminAudit(db: Db, entry: AdminAuditEntry): Promise<void> {
  if (!adminDbConfigured()) return;
  try {
    const { error } = await db.from("admin_audit_log").insert(entry);
    if (error) console.error("[admin-audit] insert failed:", error.message);
  } catch (e) {
    console.error("[admin-audit] insert threw:", e instanceof Error ? e.message : e);
  }
}
