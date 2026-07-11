import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { isMissingTableError } from "@/lib/admin-audit-core";
import { mergeTimeline, type TimelineAuditEntry } from "@/lib/admin-timeline";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id]/timeline — merged user history:
// registration + last login + payment events + admin audit + agent runs.
// admin_audit_log feature-detects migration 0011 (absent → just omitted).
export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const { data: user } = await db
    .from("users").select("created_at, last_login_at").eq("id", params.id).maybeSingle();
  if (!user) return jsonError("המשתמש לא נמצא", 404);

  const [payments, audit, runs] = await Promise.all([
    db.from("payment_events")
      .select("event_type, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("admin_audit_log")
      .select("action, actor_email, diff, meta, created_at")
      .eq("target_id", params.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("agent_runs")
      .select("agent, status, summary, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const auditEntries: TimelineAuditEntry[] =
    audit.error && isMissingTableError(audit.error) ? [] : (audit.data ?? []) as TimelineAuditEntry[];

  const events = mergeTimeline({
    user,
    paymentEvents: payments.data ?? [],
    auditEntries,
    agentRuns: runs.data ?? [],
  });

  return NextResponse.json({ events, auditAvailable: !(audit.error && isMissingTableError(audit.error)) });
}
