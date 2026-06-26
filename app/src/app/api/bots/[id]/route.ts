import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/claude";
import { jsonError, unauthorized } from "@/lib/errors";
import { enforceActiveBotLimit } from "@/lib/bot-limit";
import type { Bot } from "@/lib/types";

type Ctx = { params: { id: string } };

// GET /api/bots/[id]
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("[bot GET] db error:", error.message);
    return jsonError("טעינת הבוט נכשלה. נסה שוב.", 500);
  }
  if (!data) return jsonError("הבוט לא נמצא", 404);
  return NextResponse.json({ bot: data });
}

// PUT /api/bots/[id] — update + regenerate system prompt
export async function PUT(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let body: Partial<Bot>;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const supabase = createClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr) {
    console.error("[bot PUT] fetch error:", fetchErr.message);
    return jsonError("טעינת הבוט נכשלה. נסה שוב.", 500);
  }
  if (!existing) return jsonError("הבוט לא נמצא", 404);

  const merged = { ...(existing as Bot), ...body } as Bot;

  // A PUT can flip the bot to active too — enforce the same plan limit the
  // dedicated activate route uses, but only on a genuine off→on transition so
  // saving an already-active bot isn't blocked.
  if (merged.active === true && (existing as Bot).active !== true) {
    const limitErr = await enforceActiveBotLimit(supabase, session.authId, params.id);
    if (limitErr) return limitErr;
  }

  const update: Partial<Bot> = {
    name: merged.name,
    bot_name: merged.bot_name,
    business_type: merged.business_type,
    business_subtype: merged.business_subtype,
    description: merged.description,
    services: merged.services,
    working_hours: merged.working_hours,
    address: merged.address,
    phone: merged.phone,
    style: merged.style,
    faq: merged.faq,
    active: merged.active,
    system_prompt: buildSystemPrompt(merged),
  };

  const { data, error } = await supabase
    .from("bots")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    console.error("[bot PUT] update error:", error.message);
    return jsonError("שמירת הבוט נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ bot: data });
}

// DELETE /api/bots/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  const { error } = await supabase.from("bots").delete().eq("id", params.id);
  if (error) {
    console.error("[bot DELETE] db error:", error.message);
    return jsonError("מחיקת הבוט נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ ok: true });
}
