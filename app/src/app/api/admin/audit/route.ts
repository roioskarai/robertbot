import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { isMissingTableError } from "@/lib/admin-audit-core";

// GET /api/admin/audit?q=&action=&target=&days= — global admin audit trail.
// Feature-detects migration 0011: before it's applied, returns
// { entries: [], available: false } so the UI can show a "pending migration"
// banner instead of an error.
export async function GET(req: Request) {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const action = (url.searchParams.get("action") ?? "").trim().slice(0, 80);
  const target = (url.searchParams.get("target") ?? "").trim().slice(0, 80);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);

  const db = createAdminClient();
  let query = db
    .from("admin_audit_log")
    .select("id, actor_email, action, target_type, target_id, target_label, diff, meta, created_at")
    .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.or(`target_label.ilike.%${q}%,actor_email.ilike.%${q}%`);
  if (action) query = query.eq("action", action);
  if (target) query = query.eq("target_id", target);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return NextResponse.json({ entries: [], available: false });
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ entries: data ?? [], available: true });
}
