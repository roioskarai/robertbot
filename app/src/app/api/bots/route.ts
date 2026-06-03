import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/claude";
import { PLAN_LIMITS } from "@/lib/plans";
import { jsonError, unauthorized } from "@/lib/errors";
import type { Bot } from "@/lib/types";

// GET /api/bots — list the current user's bots
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ bots: data ?? [] });
}

// POST /api/bots — create a new bot (enforces plan bot limit)
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let body: Partial<Bot>;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  if (!body.name) return jsonError("חסר שם עסק");

  const supabase = createClient();

  // Enforce plan bot limit
  const plan = session.profile?.plan ?? "basic";
  const limit = PLAN_LIMITS[plan].bots;
  const { count } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true });
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

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ bot: data });
}
