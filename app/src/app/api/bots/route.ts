import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/claude";
import { PLAN_LIMITS } from "@/lib/plans";
import { jsonError, unauthorized } from "@/lib/errors";
import { LIMITS } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import type { Bot } from "@/lib/types";

// GET /api/bots — list the current user's bots
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  // user_id filter = defense-in-depth on top of RLS.
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("user_id", session.authId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[bots GET] db error:", error.message);
    return jsonError("טעינת הבוטים נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ bots: data ?? [] });
}

// POST /api/bots — create a new bot (enforces plan bot limit)
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`bot-create:${session.authId}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  let body: Partial<Bot>;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  if (!body.name?.trim()) return jsonError("חסר שם עסק");
  if (body.name.length > LIMITS.name) return jsonError("שם העסק ארוך מדי");
  if (body.description && body.description.length > LIMITS.description)
    return jsonError("התיאור ארוך מדי");

  const supabase = createClient();

  // Enforce plan bot limit
  const plan = session.profile?.plan ?? "basic";
  const limit = PLAN_LIMITS[plan].bots;
  const { count } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.authId);
  if ((count ?? 0) >= limit) {
    return jsonError(
      `הגעת למגבלת הבוטים במסלול ${plan} (${limit}). שדרג כדי להוסיף עוד.`,
      403,
    );
  }

  const draft: Partial<Bot> = {
    user_id: session.authId,
    name: body.name,
    bot_name: body.bot_name || body.name,
    business_type: body.business_type ?? null,
    business_subtype: body.business_subtype ?? null,
    description: body.description ?? null,
    services: body.services ?? [],
    working_hours: body.working_hours ?? null,
    address: body.address ?? null,
    phone: body.phone ?? null,
    style: body.style ?? "friendly",
    faq: body.faq ?? [],
    active: false,
  };

  // Generate the system prompt from the config
  draft.system_prompt = buildSystemPrompt(draft as Bot);

  const { data, error } = await supabase
    .from("bots")
    .insert(draft)
    .select("*")
    .single();

  if (error) {
    console.error("[bots POST] db error:", error.message);
    return jsonError("יצירת הבוט נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ bot: data });
}
