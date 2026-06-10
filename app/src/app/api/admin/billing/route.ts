import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { PRICING, planLabelHe, type PlanId, type BillingCycle } from "@/lib/plans";

// GET /api/admin/billing — revenue breakdown + paying customers.
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const { data: users } = await db
    .from("users")
    .select("id, email, plan, billing_cycle, subscription_status, payment_provider, pack_balance, trial_ends_at, created_at");

  const u = users ?? [];
  const paying = u.filter((x) => x.subscription_status === "active");

  let mrr = 0;
  const byPlan: Record<string, { count: number; mrr: number; label: string }> = {};
  for (const row of paying) {
    const plan = row.plan as PlanId;
    const cycle = (row.billing_cycle as BillingCycle) ?? "monthly";
    const price = PRICING[plan]?.[cycle] ?? 0;
    mrr += price;
    const b = (byPlan[plan] ??= { count: 0, mrr: 0, label: planLabelHe(plan) });
    b.count++;
    b.mrr += price;
  }

  return NextResponse.json({
    summary: {
      mrr,
      arr: mrr * 12,
      payingCustomers: paying.length,
      trials: u.filter((x) => x.subscription_status === "trial").length,
      cancelled: u.filter((x) => x.subscription_status === "cancelled").length,
      currency: "₪",
    },
    byPlan,
    customers: paying.map((x) => ({
      id: x.id,
      email: x.email,
      plan: x.plan,
      cycle: x.billing_cycle,
      provider: x.payment_provider,
      since: x.created_at,
    })),
  });
}
