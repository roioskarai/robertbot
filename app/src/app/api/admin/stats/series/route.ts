import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { bucketByDay } from "@/lib/table";

// GET /api/admin/stats/series?days=30 — daily time series for the overview
// charts (signups + conversations). Zero-filled so charts show a continuous
// axis. Row volume is capped; revisit with an RPC if tables grow past ~10k
// rows in the window.
export async function GET(req: Request) {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [{ data: users }, { data: convs }] = await Promise.all([
    db.from("users").select("created_at").gte("created_at", sinceIso).limit(10_000),
    db.from("conversations").select("created_at").gte("created_at", sinceIso).limit(10_000),
  ]);

  return NextResponse.json({
    days,
    signups: bucketByDay((users ?? []).map((u) => u.created_at), days),
    conversations: bucketByDay((convs ?? []).map((c) => c.created_at), days),
  });
}
