import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseUserQuery, buildUserListQuery, countUsersByFilter, resolveBotSegment } from "@/lib/admin-users-query";

// GET /api/admin/users?filter=&plan=&q=&sort=&dir=&inactiveDays=
// Server-side filtered user list + per-category counters + bot counts.
// (Still accepts the legacy ?status=&comp=1 params.)
export async function GET(req: Request) {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();
  const f = parseUserQuery(new URL(req.url).searchParams);
  // Cross-table filters (bot_no_number / no_bot) need their id set resolved
  // before the list query runs; no-op for every other filter.
  f.segmentIds = await resolveBotSegment(db, f.filter);

  const [{ data: users, error }, counters] = await Promise.all([
    buildUserListQuery(db, f),
    countUsersByFilter(db, f.inactiveDays),
  ]);

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
    counters,
  });
}
