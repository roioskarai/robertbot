// Shared inbound-message pipeline, provider-agnostic. Both the Twilio and Meta
// webhooks resolve the tenant bot, then hand the message here for dedup,
// rate-limiting, conversation handling, quota, AI reply and usage accounting.

import { createAdminClient } from "@/lib/supabase/admin";
import { generateReply, hasAnthropicKey } from "@/lib/claude";
import { getWhatsAppProvider, hasWhatsApp } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/rate-limit";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { deriveSubscriptionState } from "@/lib/subscription";
import type { Bot } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

export interface InboundMessage {
  bot: Bot;
  /** Customer phone (any format; normalized for storage). */
  customerPhone: string;
  body: string;
  /** Provider message id for idempotency (Twilio SID / Meta wamid). */
  messageId: string | null;
  profileName: string | null;
}

function stripWa(n: string): string {
  return n.replace(/^whatsapp:/, "").replace(/[\s-]/g, "");
}

/** Runs the full reply pipeline for one inbound message. Never throws. */
export async function processInboundMessage(msg: InboundMessage): Promise<void> {
  const { bot } = msg;
  if (!bot.active) return;

  const supabase = createAdminClient();
  const customerPhone = stripWa(msg.customerPhone);

  // Idempotency — providers may resend the same id.
  if (msg.messageId) {
    const { data: dup } = await supabase
      .from("messages")
      .select("id")
      .eq("provider_message_id", msg.messageId)
      .maybeSingle();
    if (dup) return;
  }

  if (!checkRateLimit(bot.id).allowed) return;

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
        customer_name: msg.profileName,
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
    body: msg.body,
    provider_message_id: msg.messageId || null,
  });

  // If a human is handling this conversation, don't auto-reply.
  if ((existing?.status ?? "bot") === "human") return;
  if (!hasAnthropicKey()) return; // engine off — message stored, no reply

  // Don't serve AI to accounts without an entitled subscription. This blocks
  // cancelled/paused AND expired trials (a trial past trial_ends_at keeps the
  // raw status 'trial' until the daily cron runs — derive the real state so we
  // stop replying immediately, not up to a day late). Message is still stored.
  const { data: userRow } = await supabase
    .from("users")
    .select("subscription_status, trial_ends_at")
    .eq("id", bot.user_id)
    .maybeSingle();
  const subState = deriveSubscriptionState(userRow ?? {});
  if (subState.status === "cancelled" || subState.status === "paused" || subState.status === "trial_expired") return;

  // Quota: monthly plan quota first, then never-expiring pack balance.
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
    if ((u?.pack_balance ?? 0) <= 0) return; // quota + pack exhausted → silent
    consumePack = true;
  }

  // Last 10 messages for context (exclude the just-saved one).
  const { data: history } = await supabase
    .from("messages")
    .select("from_type, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);
  const ordered = (history ?? []).reverse().slice(0, -1);

  let reply;
  try {
    reply = await generateReply(bot, ordered, msg.body);
  } catch {
    return;
  }

  if (reply.handoff) {
    await supabase
      .from("conversations")
      .update({ status: "human" })
      .eq("id", conversationId);
  }

  const wa = getWhatsAppProvider();
  const outText = wa.formatButtons(reply.text, reply.buttons);

  // Deliver FROM this bot's own sender (tenant isolation).
  if (hasWhatsApp()) {
    try {
      await wa.sendMessage(bot, msg.customerPhone, outText);
    } catch {
      /* keep going — message is still recorded */
    }
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    from_type: "bot",
    body: outText,
  });

  // Record usage — atomic operations to avoid race conditions under concurrent messages.
  if (consumePack) {
    // Atomic decrement: only deducts if balance > 0 (prevents going negative).
    await supabase.rpc("decrement_pack_balance", { uid: bot.user_id });
  } else {
    await incrementUsage(supabase, bot.user_id, bot.id, period);
  }
}

// ── helpers ──────────────────────────────────────────────────
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
  // Atomic insert-or-increment in Postgres (see migration 0004) — avoids the
  // read-then-write race under concurrent messages.
  await supabase.rpc("increment_usage", { uid: userId, bid: botId, p: period });
}
