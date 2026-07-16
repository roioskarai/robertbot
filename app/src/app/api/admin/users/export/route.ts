import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseUserQuery, buildUserListQuery, resolveBotSegment } from "@/lib/admin-users-query";
import { logAdminAudit } from "@/lib/admin-audit";

// GET /api/admin/users/export?<same params as the list> → CSV download.
// Reuses the exact same filtered query as the list so the export can't drift.
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);

  const db = createAdminClient();
  const f = parseUserQuery(new URL(req.url).searchParams);
  f.segmentIds = await resolveBotSegment(db, f.filter);

  const { data: users, error } = await buildUserListQuery(db, f);
  if (error) {
    console.error("[admin/users/export] db error:", error.message);
    return jsonError("ייצוא המשתמשים נכשל.", 500);
  }

  const cols = [
    "email", "full_name", "plan", "billing_cycle", "subscription_status",
    "is_comp", "pack_balance", "is_suspended", "trial_ends_at",
    "subscription_ends_at", "last_login_at", "created_at",
  ] as const;

  const esc = (v: unknown): string => {
    let s = v === null || v === undefined ? "" : String(v);
    // Neutralize spreadsheet formula triggers (CSV/DDE injection, CWE-1236) —
    // full_name is customer-controlled and lands here unmodified.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = [
    cols.join(","),
    ...(users ?? []).map((u) => cols.map((k) => esc((u as Record<string, unknown>)[k])).join(",")),
  ];
  // UTF-8 BOM so Excel renders Hebrew correctly.
  const csv = "﻿" + rows.join("\r\n");

  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: "users.export",
    target_type: "system",
    meta: { filter: f.filter, plan: f.plan, q: f.q, count: users?.length ?? 0 },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
