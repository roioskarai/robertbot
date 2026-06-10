import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { PRICING, type PlanId, type BillingCycle } from "@/lib/plans";

// GET /api/admin/stats — system-wide metrics for the admin overview.
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const [{ data: users }, { data: bots }, { data: convs }, { data: runs }] = await Promise.all([
    db.from("users").select("id, plan, billing_cycle, subscription_status, created_at, is_suspended"),
    db.from("bots").select("id, active, wa_provider"),
    db.from("conversations").select("id, status, last_message_at"),
    db.from("agent_runs").select("id, status, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const u = users ?? [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // MRR — sum of active subscriptions' monthly-equivalent price.
  let mrr = 0;
  const planMix: Record<string, number> = {};
  for (const row of u) {
    if (row.subscription_status === "active") {
      const plan = row.plan as PlanId;
      const cycle = (row.billing_cycle as BillingCycle) ?? "monthly";
      const price = PRICING[plan]?.[cycle] ?? 0;
      mrr += price; // annual price is already per-month in PRICING
      planMix[plan] = (planMix[plan] ?? 0) + 1;
    }
  }

  const statusCount = (s: string) => u.filter((x) => x.subscription_status === s).length;

  return NextResponse.json({
    users: {
      total: u.length,
      active: statusCount("active"),
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
