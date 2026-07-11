import "server-only";

// Global admin audit trail (admin_audit_log, migration 0011) — write side.
//
// Mirrors the CMS logAudit() philosophy (lib/site/admin.ts): logging must
// never break the action it documents. Until migration 0011 is applied the
// table doesn't exist — writes are swallowed (with one console.error so the
// gap is visible in server logs) and readers feature-detect via
// isMissingTableError() from lib/admin-audit-core.ts.

import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
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

/**
 * Record a webhook signature-validation failure (feeds the security alert in
 * the admin bell). Throttled per provider so a flood can't spam the table;
 * never throws — webhooks must stay bulletproof.
 */
export async function logWebhookSignatureFailure(provider: string, ip?: string | null): Promise<void> {
  if (!rateLimit(`sig-fail-log:${provider}`, 5, 3_600_000).allowed) return;
  await logAdminAudit(createAdminClient(), {
    action: "security.webhook_signature_failed",
    target_type: "system",
    target_id: provider,
    target_label: provider,
    meta: { provider, ip: ip ?? null },
  });
}
