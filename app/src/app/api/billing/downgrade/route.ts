import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { isPlanId, planLabelHe, PLAN_IDS } from "@/lib/plans";
import { jsonError, unauthorized } from "@/lib/errors";
import type { PlanId } from "@/lib/plans";

// Numeric rank for each plan (ascending = higher tier).
const PLAN_RANK = Object.fromEntries(PLAN_IDS.map((p, i) => [p, i])) as Record<string, number>;

// POST /api/billing/downgrade  body: { plan }
// Records the target plan; takes effect at the next billing cycle.
// This endpoint is downgrade-only — upgrades must go through /api/billing/checkout
// so payment is collected first.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  if (!body.plan || !isPlanId(body.plan)) return jsonError("מסלול לא חוקי");

  const supabase = createClient();

  // Fetch current plan to block free upgrades via this endpoint.
  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", session.authId)
    .single();
  const currentRank = PLAN_RANK[(user?.plan as PlanId) ?? "basic"] ?? 0;
  const newRank = PLAN_RANK[body.plan] ?? 0;
  if (newRank >= currentRank) {
    return jsonError("לשדרוג מסלול השתמש בדף המנוי");
  }

  await supabase.from("users").update({ plan: body.plan }).eq("id", session.authId);

  return NextResponse.json({
    ok: true,
    message: `המעבר למסלול ${planLabelHe(body.plan)} ייכנס לתוקף בתחילת תקופת החיוב הבאה.`,
  });
}
