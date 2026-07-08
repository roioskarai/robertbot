import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/claude";
import { jsonError, unauthorized } from "@/lib/errors";
import { enforceActiveBotLimit } from "@/lib/bot-limit";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, botUpdateSchema } from "@/lib/schemas";
import type { Bot } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bots/[id]
export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = await createClient();
  // user_id filter = defense-in-depth on top of RLS.
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", session.authId)
    .maybeSingle();

  if (error) {
    console.error("[bot GET] db error:", error.message);
    return jsonError("טעינת הבוט נכשלה. נסה שוב.", 500);
  }
  if (!data) return jsonError("הבוט לא נמצא", 404);
  return NextResponse.json({ bot: data });
}

// PUT /api/bots/[id] — update + regenerate system prompt
export async function PUT(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`bot-write:${session.authId}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(botUpdateSchema, raw);
  if (!parsed.ok) return jsonError(parsed.message);
  const body = parsed.data;

  const supabase = await createClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", session.authId)
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
  // Only touch the migration-0010 columns when the client actually sent them.
  // Pre-migration the editor hides these fields, so they never reach the DB.
  if (body.website !== undefined) update.website = merged.website;
  if (body.custom_instructions !== undefined) update.custom_instructions = merged.custom_instructions;

  const { data, error } = await supabase
    .from("bots")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", session.authId)
    .select("*")
    .single();

  if (error) {
    console.error("[bot PUT] update error:", error.message);
    return jsonError("שמירת הבוט נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ bot: data });
}

// DELETE /api/bots/[id]
export async function DELETE(_req: Request, props: Ctx) {
  const params = await props.params;
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`bot-write:${session.authId}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bots")
    .delete()
    .eq("id", params.id)
    .eq("user_id", session.authId);
  if (error) {
    console.error("[bot DELETE] db error:", error.message);
    return jsonError("מחיקת הבוט נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ ok: true });
}
