import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/activate  body: { active?: boolean }  (default true)
export async function POST(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let active = true;
  try {
    const body = await req.json();
    if (typeof body?.active === "boolean") active = body.active;
  } catch {
    /* default true */
  }

  const supabase = createClient();

  // Enforce plan bot limit when activating.
  if (active) {
    const { data: userRow } = await supabase
      .from("users")
      .select("plan")
      .eq("id", session.authId)
      .single();
    const plan = ((userRow?.plan as PlanId) ?? "basic") as PlanId;
    const limit = PLAN_LIMITS[plan].bots;
    const { count } = await supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .neq("id", params.id);
    if ((count ?? 0) >= limit) {
      return jsonError(`המסלול שלך מאפשר עד ${limit} בוטים פעילים בו-זמנית — שדרג כדי להוסיף יותר`, 403);
    }
  }

  const { data, error } = await supabase
    .from("bots")
    .update({ active })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, bot: data });
}
