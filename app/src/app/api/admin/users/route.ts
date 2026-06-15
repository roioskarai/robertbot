import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/users?q=&status= — full user list with bot counts.
export async function GET(req: Request) {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status")?.trim();

  let query = db
    .from("users")
    .select("id, email, full_name, role, plan, billing_cycle, subscription_status, pack_balance, is_suspended, totp_enabled, trial_ends_at, last_login_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (q) query = query.ilike("email", `%${q}%`);
  if (status) query = query.eq("subscription_status", status);

  const { data: users, error } = await query;
  if (error) {
    console.error("[admin/users] db error:", error.message);
    return jsonError("טעינת המשתמשים נכשלה.", 500);
  }

  // Bot counts per user.
  const { data: bots } = await db.from("bots").select("user_id, active");
  const counts: Record<string, { total: number; active: number }> = {};
  for (const b of bots ?? []) {
    const c = (counts[b.user_id] ??= { total: 0, active: 0 });
    c.total++;
    if (b.active) c.active++;
  }

  return NextResponse.json({
    users: (users ?? []).map((u) => ({ ...u, bots: counts[u.id] ?? { total: 0, active: 0 } })),
  });
}
