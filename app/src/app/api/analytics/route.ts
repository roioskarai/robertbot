import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import { deriveSubscriptionState } from "@/lib/subscription";
import { unauthorized } from "@/lib/errors";

const HE_MONTHS = ["ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יוני", "יולי", "אוג'", "ספט'", "אוק'", "נוב'", "דצמ'"];

export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = await createClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Bots
  const { data: bots } = await supabase.from("bots").select("id, active");
  const totalBots = bots?.length ?? 0;
  const activeBots = bots?.filter((b) => b.active).length ?? 0;

  // Conversations
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, status, last_message_at, bot_id");
  const openConversations = convs?.filter((c) => c.status === "human").length ?? 0;
  const closedThisMonth =
    convs?.filter(
      (c) => c.status === "closed" && new Date(c.last_message_at) >= startOfMonth,
    ).length ?? 0;

  // Messages (RLS scopes to this user's bots)
  const { data: msgs } = await supabase
    .from("messages")
    .select("created_at, from_type")
    .gte("created_at", sixMonthsAgo.toISOString());

  const all = msgs ?? [];
  const messagesToday = all.filter((m) => new Date(m.created_at) >= startOfDay).length;
  const messagesThisMonth = all.filter(
    (m) => new Date(m.created_at) >= startOfMonth,
  ).length;

  // Weekly chart — last 7 days (Sun..Sat of current week order, simple last-7)
  const weekly: number[] = Array(7).fill(0);
  const weekStart = new Date(startOfDay);
  weekStart.setDate(weekStart.getDate() - 6);
  for (const m of all) {
    const d = new Date(m.created_at);
    if (d >= weekStart) {
      const idx = Math.floor((d.getTime() - weekStart.getTime()) / 86_400_000);
      if (idx >= 0 && idx < 7) weekly[idx]++;
    }
  }

  // Monthly chart — last 6 months
  const monthly: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = all.filter((m) => {
      const t = new Date(m.created_at);
      return t >= d && t < next;
    }).length;
    monthly.push({ label: HE_MONTHS[d.getMonth()], count });
  }

  // Derive the display-ready subscription state once, so every consumer reads
  // the same truth (never the raw 'basic'/'trial' column defaults).
  const subscription = deriveSubscriptionState(session.profile ?? {}, now);
  const plan = subscription.plan;
  const quota = PLAN_LIMITS[plan].messages;
  const botLimit = PLAN_LIMITS[plan].bots;

  const botMsgs = all.filter((m) => m.from_type === "bot").length;
  const handoffMsgs = all.filter((m) => m.from_type === "human").length;
  const totalReplies = botMsgs + handoffMsgs;

  // Per-bot stats for the "My Bots" management cards: this month's message
  // usage (from usage_logs) + distinct customer conversations. RLS-scoped.
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: usageRows } = await supabase
    .from("usage_logs")
    .select("bot_id, message_count")
    .eq("period", period);
  const perBot = (bots ?? []).map((b) => ({
    botId: b.id as string,
    messagesThisMonth: (usageRows ?? [])
      .filter((u) => u.bot_id === b.id)
      .reduce((sum, u) => sum + (u.message_count ?? 0), 0),
    conversations: (convs ?? []).filter((cv) => cv.bot_id === b.id).length,
  }));

  return NextResponse.json({
    messagesToday,
    openConversations,
    closedThisMonth,
    activeBots,
    totalBots,
    plan,
    quota,
    botLimit,
    messagesThisMonth,
    // Full derived subscription state — the source of truth for billing UI.
    subscription,
    // Flat fields kept for backward compatibility with existing consumers.
    subscriptionStatus: session.profile?.subscription_status ?? "trial",
    subscriptionEndsAt: session.profile?.subscription_ends_at ?? null,
    billingCycle: session.profile?.billing_cycle ?? "monthly",
    cancelAtPeriodEnd: session.profile?.cancel_at_period_end ?? false,
    trialEndsAt: session.profile?.trial_ends_at ?? null,
    isComp: subscription.isComp,
    accountCreatedAt: session.profile?.created_at ?? null,
    packBalance: session.profile?.pack_balance ?? 0,
    perBot,
    weekly,
    monthly,
    metrics: {
      botAnsweredPct: totalReplies ? Math.round((botMsgs / totalReplies) * 100) : 0,
      handoffPct: totalReplies ? Math.round((handoffMsgs / totalReplies) * 100) : 0,
    },
  });
}
