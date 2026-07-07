import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { payingMetrics } from "@/lib/admin-metrics";

// GET /api/admin/stats — system-wide metrics for the admin overview.
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const [{ data: users }, { data: bots }, { data: convs }, { data: runs }] = await Promise.all([
    db.from("users").select("id, plan, billing_cycle, subscription_status, created_at, is_suspended, is_comp"),
    db.from("bots").select("id, active, wa_provider"),
    db.from("conversations").select("id, status, last_message_at"),
    db.from("agent_runs").select("id, status, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const u = users ?? [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // MRR — paying subscribers only; admin comp grants are excluded.
  const { mrr, planMix, paying, comps } = payingMetrics(u);

  const statusCount = (s: string) => u.filter((x) => x.subscription_status === s).length;

  return NextResponse.json({
    users: {
      total: u.length,
      active: statusCount("active"),
      paying,
      comp: comps,
      trial: statusCount("trial"),
      cancelled: statusCount("cancelled"),
      paused: statusCount("paused"),
      suspended: u.filter((x) => x.is_suspended).length,
      newThisMonth: u.filter((x) => new Date(x.created_at) >= startOfMonth).length,
    },
    revenue: { mrr, arr: mrr * 12, currency: "₪" },
    planMix,
    bots: {
      total: bots?.length ?? 0,
      active: bots?.filter((b) => b.active).length ?? 0,
      meta: bots?.filter((b) => b.wa_provider === "meta").length ?? 0,
    },
    conversations: {
      total: convs?.length ?? 0,
      human: convs?.filter((c) => c.status === "human").length ?? 0,
    },
    agentRuns: (runs ?? []).map((r) => ({ id: r.id, status: r.status, created_at: r.created_at })),
  });
}
