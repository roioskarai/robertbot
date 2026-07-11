import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { deriveNotifications, type AdminNotifSecurityRow } from "@/lib/admin-notifications";
import { isMissingTableError } from "@/lib/admin-audit-core";

// GET /api/admin/notifications — alerts computed on the fly (no table).
// Trials ending ≤48h, comps expiring ≤7d, agent failures (single + repeated),
// new signups, orphan payments, signup drop, dormant trials, webhook-signature
// failures (from admin_audit_log — feature-detected until migration 0011).
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

  const [{ data: users }, { data: runs }, payments, audit] = await Promise.all([
    db.from("users").select("id, email, subscription_status, trial_ends_at, is_comp, subscription_ends_at, created_at, last_login_at, is_suspended"),
    db.from("agent_runs").select("id, agent, status, created_at").order("created_at", { ascending: false }).limit(200),
    db.from("payment_events").select("event_type, user_id, created_at").gte("created_at", weekAgo).limit(200),
    db.from("admin_audit_log")
      .select("action, created_at")
      .eq("action", "security.webhook_signature_failed")
      .gte("created_at", dayAgo)
      .limit(100),
  ]);

  const securityEvents: AdminNotifSecurityRow[] =
    audit.error && isMissingTableError(audit.error) ? [] : ((audit.data ?? []) as AdminNotifSecurityRow[]);

  const notifications = deriveNotifications(users ?? [], runs ?? [], new Date(), {
    paymentEvents: payments.data ?? [],
    securityEvents,
  });
  return NextResponse.json(
    { notifications },
    { headers: { "Cache-Control": "no-store" } },
  );
}
