import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { parseBody, replySchema } from "@/lib/schemas";
import { getWhatsAppProvider, hasWhatsApp } from "@/lib/whatsapp";
import type { Bot } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/conversations/[id]/reply  body: { body } — human agent reply
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await getSessionUser();
  if (!session) return unauthorized();

  // Throttle human-agent sends — each one delivers a paid WhatsApp message.
  if (!rateLimit(`reply:${session.authId}:${clientKey(req)}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי הודעות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(replySchema, raw);
  if (!parsed.ok) return jsonError(parsed.message);
  const text = parsed.data.body;

  const supabase = await createClient();
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("*, bots!inner(user_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (convErr) {
    console.error("[reply] conversation fetch error:", convErr.message);
    return jsonError("טעינת השיחה נכשלה. נסה שוב.", 500);
  }
  if (!conv) return jsonError("השיחה לא נמצאה", 404);

  // Ownership via the bot relation — defense-in-depth on top of RLS.
  if ((conv as { bots?: { user_id?: string } }).bots?.user_id !== session.authId) {
    return jsonError("השיחה לא נמצאה", 404);
  }

  // Persist the human message and mark conversation as human-handled.
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({ conversation_id: params.id, from_type: "human", body: text })
    .select("*")
    .single();
  if (msgErr) {
    console.error("[reply] message insert error:", msgErr.message);
    return jsonError("שליחת ההודעה נכשלה. נסה שוב.", 500);
  }

  await supabase
    .from("conversations")
    .update({ status: "human", last_message_at: new Date().toISOString() })
    .eq("id", params.id);

  // Deliver to the customer over WhatsApp FROM this bot's own sender (best-effort).
  if (hasWhatsApp()) {
    const { data: bot } = await supabase
      .from("bots")
      .select("*")
      .eq("id", conv.bot_id)
      .maybeSingle();
    if (bot) {
      try {
        await getWhatsAppProvider((bot as Bot).wa_provider).sendMessage(bot as Bot, conv.customer_phone, text);
      } catch (e) {
        // Delivery failure shouldn't drop the saved message, but it should
        // stop the UI from lying about connection health — same decoupled,
        // best-effort status write used by the inbound pipeline.
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`[reply] send failed for bot ${(bot as Bot).id}:`, errMsg);
        try {
          await supabase
            .from("bots")
            .update({ wa_connection_status: "error", wa_last_error: errMsg.slice(0, 500) })
            .eq("id", (bot as Bot).id);
        } catch {
          /* status tracking only */
        }
      }
    }
  }

  return NextResponse.json({ ok: true, message: msg });
}
