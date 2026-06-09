import { NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReply, hasAnthropicKey } from "@/lib/claude";
import { getWhatsAppProvider, hasWhatsApp } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/rate-limit";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import type { Bot } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const ok = () =>
  new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });

function stripWa(n: string): string {
  return n.replace(/^whatsapp:/, "").replace(/[\s-]/g, "");
}

/** Matches a Twilio number against a stored bot whatsapp_number (loose). */
function numbersMatch(a: string | null, b: string): boolean {
  if (!a) return false;
  const na = stripWa(a).replace(/^\+?972/, "0").replace(/^\+/, "");
  const nb = stripWa(b).replace(/^\+?972/, "0").replace(/^\+/, "");
  return na === nb || na.endsWith(nb.slice(-9)) || nb.endsWith(na.slice(-9));
}

export async function POST(req: Request) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);

  // Optional Twilio signature validation (when a signature header is present).
  const sig = req.headers.get("x-twilio-signature");
  if (sig && process.env.TWILIO_AUTH_TOKEN) {
    const obj: Record<string, string> = {};
    params.forEach((v, k) => (obj[k] = v));
    const valid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      sig,
      req.url,
      obj,
    );
    if (!valid) return new NextResponse("invalid signature", { status: 403 });
  }

  const from = params.get("From") || ""; // customer
  const to = params.get("To") || ""; // business (bot) number
  const body = (params.get("Body") || "").trim();
  const sid = params.get("MessageSid") || params.get("SmsMessageSid") || "";
  const profileName = params.get("ProfileName") || null;
  if (!from || !body) return ok();

  const supabase = createAdminClient();

  // Find the bot by its WhatsApp (business) number.
  const { data: bots } = await supabase
    .from("bots")
    .select("*")
    .not("whatsapp_number", "is", null);
  const bot = (bots as Bot[] | null)?.find((b) =>
    numbersMatch(b.whatsapp_number, to),
  );
  if (!bot || !bot.active) return ok();

  // Idempotency — Twilio may resend the same MessageSid.
  if (sid) {
    const { data: dup } = await supabase
      .from("messages")
      .select("id")
      .eq("twilio_message_sid", sid)
      .maybeSingle();
    if (dup) return ok();
  }

  // Rate limit per bot.
  if (!checkRateLimit(bot.id).allowed) return ok();

  const customerPhone = stripWa(from);

  // Find or create the conversation.
  let conversationId: string;
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("bot_id", bot.id)
    .eq("customer_phone", customerPhone)
    .maybeSingle();

  if (existing) {
    conversationId = existing.id;
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
  } else {
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        bot_id: bot.id,
        customer_phone: customerPhone,
        customer_name: profileName,
        status: "bot",
      })
      .select("id, status")
      .single();
    conversationId = created!.id;
  }

  // Save the incoming customer message.
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    from_type: "customer",
    body,
    twilio_message_sid: sid || null,
  });

  // If a human is handling this conversation, don't auto-reply.
  const status = existing?.status ?? "bot";
  if (status === "human") return ok();

  if (!hasAnthropicKey()) return ok(); // engine off — message stored, no reply

  // Quota check: monthly plan quota is consumed first, then pack balance.
  const period = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const plan = (await getUserPlan(supabase, bot.user_id)) ?? "basic";
  const quota = PLAN_LIMITS[plan].messages;
  const used = await getMonthlyUsage(supabase, bot.user_id, period);

  let consumePack = false;
  if (used >= quota) {
    const { data: u } = await supabase
      .from("users")
      .select("pack_balance")
      .eq("id", bot.user_id)
      .maybeSingle();
    if ((u?.pack_balance ?? 0) <= 0) return ok(); // quota + pack exhausted → silent
    consumePack = true;
  }

  // Load last 10 messages for context.
  const { data: history } = await supabase
    .from("messages")
    .select("from_type, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);
  const ordered = (history ?? []).reverse().slice(0, -1); // exclude the just-saved msg

  let reply;
  try {
    reply = await generateReply(bot, ordered, body);
  } catch {
    return ok();
  }

  if (reply.handoff) {
    await supabase
      .from("conversations")
      .update({ status: "human" })
      .eq("id", conversationId);
  }

  const wa = getWhatsAppProvider();
  const outText = wa.formatButtons(reply.text, reply.buttons);

  // Deliver the reply FROM this bot's own sender (tenant isolation).
  if (hasWhatsApp()) {
    try {
      await wa.sendMessage(bot, from, outText);
    } catch {
      /* keep going — message is still recorded */
    }
  }

  // Persist the bot reply.
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    from_type: "bot",
    body: outText,
  });

  // Record usage.
  if (consumePack) {
    const { data: u } = await supabase
      .from("users")
      .select("pack_balance")
      .eq("id", bot.user_id)
      .maybeSingle();
    await supabase
      .from("users")
      .update({ pack_balance: Math.max(0, (u?.pack_balance ?? 0) - 1) })
      .eq("id", bot.user_id);
  } else {
    await incrementUsage(supabase, bot.user_id, bot.id, period);
  }

  return ok();
}

// ── helpers ──────────────────────────────────────────────────
type Admin = ReturnType<typeof createAdminClient>;

async function getUserPlan(supabase: Admin, userId: string): Promise<PlanId | null> {
  const { data } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  return (data?.plan as PlanId) ?? null;
}

async function getMonthlyUsage(
  supabase: Admin,
  userId: string,
  period: string,
): Promise<number> {
  const { data } = await supabase
    .from("usage_logs")
    .select("message_count")
    .eq("user_id", userId)
    .eq("period", period);
  return (data ?? []).reduce((s, r) => s + (r.message_count ?? 0), 0);
}

async function incrementUsage(
  supabase: Admin,
  userId: string,
  botId: string,
  period: string,
) {
  const { data: row } = await supabase
    .from("usage_logs")
    .select("id, message_count")
    .eq("user_id", userId)
    .eq("bot_id", botId)
    .eq("period", period)
    .maybeSingle();
  if (row) {
    await supabase
      .from("usage_logs")
      .update({ message_count: (row.message_count ?? 0) + 1 })
      .eq("id", row.id);
  } else {
    await supabase
      .from("usage_logs")
      .insert({ user_id: userId, bot_id: botId, period, message_count: 1 });
  }
}
