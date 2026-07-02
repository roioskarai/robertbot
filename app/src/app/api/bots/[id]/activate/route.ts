import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { enforceActiveBotLimit } from "@/lib/bot-limit";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/activate  body: { active?: boolean }  (default true)
export async function POST(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`bot-write:${session.authId}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

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
    const limitErr = await enforceActiveBotLimit(supabase, session.authId, params.id);
    if (limitErr) return limitErr;
  }

  const { data, error } = await supabase
    .from("bots")
    .update({ active })
    .eq("id", params.id)
    .eq("user_id", session.authId)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, bot: data });
}
