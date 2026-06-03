import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { isPlanId, planLabelHe } from "@/lib/plans";
import { jsonError, unauthorized } from "@/lib/errors";

// POST /api/billing/downgrade  body: { plan }
// Records the target plan; takes effect at the next billing cycle.
// (Upgrades that require immediate payment go through /api/billing/checkout.)
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
  await supabase.from("users").update({ plan: body.plan }).eq("id", session.authId);

  return NextResponse.json({
    ok: true,
    message: `המעבר למסלול ${planLabelHe(body.plan)} ייכנס לתוקף בתחילת תקופת החיוב הבאה.`,
  });
}
