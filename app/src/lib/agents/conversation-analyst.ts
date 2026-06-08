import type { AgentResult, FaqItem, ProposedAction } from "@/lib/types";
import { callClaude, extractJson, type Agent, type AgentContext } from "./runner";

/**
 * conversation-analyst — reads recent conversations across ALL bots, finds
 * where bots fail (handoff spikes, repeated misunderstanding), and drafts
 * concrete prompt + FAQ improvements per bot.
 *
 * Reliability: read-only. It NEVER edits a live bot. Every suggestion is a
 * `proposed_action` for the owner/tenant to approve. Idempotent per day.
 */

const LOOKBACK_DAYS = 7;
const MAX_BOTS_PER_RUN = 6; // cap Claude cost; prioritize the noisiest bots
const MAX_TRANSCRIPT_MSGS = 24;

interface MsgRow {
  conversation_id: string;
  from_type: "customer" | "bot" | "human";
  body: string;
  created_at: string;
}

interface BotStat {
  id: string;
  name: string;
  bot_name: string;
  faq: FaqItem[];
  customer: number;
  bot: number;
  human: number; // handoff replies
  handoffConvIds: Set<string>;
}

interface Analysis {
  diagnosis: string; // Hebrew, one paragraph
  promptAddition: string; // Hebrew text to append to the system prompt
  faqSuggestions: FaqItem[];
}

export const conversationAnalyst: Agent = {
  name: "conversation-analyst",
  async run(ctx: AgentContext): Promise<AgentResult> {
    const since = new Date(
      ctx.now.getTime() - LOOKBACK_DAYS * 86_400_000,
    ).toISOString();

    const { data: bots } = await ctx.supabase
      .from("bots")
      .select("id, name, bot_name, faq")
      .limit(100);

    const { data: convs } = await ctx.supabase
      .from("conversations")
      .select("id, bot_id, status")
      .gte("last_message_at", since);

    const { data: msgs } = await ctx.supabase
      .from("messages")
      .select("conversation_id, from_type, body, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(3000);

    const convToBot = new Map<string, string>();
    for (const c of convs ?? []) convToBot.set(c.id, c.bot_id);

    // Aggregate per-bot signal.
    const stats = new Map<string, BotStat>();
    for (const b of bots ?? []) {
      stats.set(b.id, {
        id: b.id,
        name: b.name,
        bot_name: b.bot_name,
        faq: (b.faq as FaqItem[]) ?? [],
        customer: 0,
        bot: 0,
        human: 0,
        handoffConvIds: new Set(),
      });
    }
    const msgsByConv = new Map<string, MsgRow[]>();
    for (const m of (msgs as MsgRow[]) ?? []) {
      const botId = convToBot.get(m.conversation_id);
      if (!botId) continue;
      const s = stats.get(botId);
      if (!s) continue;
      s[m.from_type]++;
      if (m.from_type === "human") s.handoffConvIds.add(m.conversation_id);
      const arr = msgsByConv.get(m.conversation_id) ?? [];
      arr.push(m);
      msgsByConv.set(m.conversation_id, arr);
    }

    // Prioritize bots that actually struggled: any handoff, then by volume.
    const candidates = Array.from(stats.values())
      .filter((s) => s.customer > 0 && (s.human > 0 || s.bot >= 10))
      .sort((a, b) => b.human - a.human || b.customer - a.customer)
      .slice(0, MAX_BOTS_PER_RUN);

    const proposedActions: ProposedAction[] = [];
    let tokens = 0;
    let analyzed = 0;

    for (const s of candidates) {
      const transcript = buildTranscript(s, msgsByConv);
      if (!transcript) continue;
      try {
        const { text, tokens: t } = await callClaude({
          system: ANALYST_SYSTEM,
          prompt: analystPrompt(s, transcript),
          maxTokens: 1200,
        });
        tokens += t;
        const a = extractJson<Analysis>(text);
        analyzed++;

        if (a.promptAddition?.trim()) {
          proposedActions.push({
            type: "prompt_improvement",
            target: s.id,
            label: `שיפור prompt ל"${s.name}": ${a.diagnosis?.slice(0, 80) ?? ""}`,
            payload: { diagnosis: a.diagnosis, promptAddition: a.promptAddition },
            status: "pending",
          });
        }
        if (Array.isArray(a.faqSuggestions) && a.faqSuggestions.length > 0) {
          proposedActions.push({
            type: "faq_addition",
            target: s.id,
            label: `${a.faqSuggestions.length} שאלות נפוצות חדשות ל"${s.name}"`,
            payload: { items: a.faqSuggestions },
            status: "pending",
          });
        }
      } catch {
        // Skip this bot on parse/API failure; keep the run alive for the rest.
      }
    }

    const summary =
      analyzed === 0
        ? "לא נמצאו שיחות מספיקות לניתוח השבוע"
        : `ניתחתי ${analyzed} בוטים — ${proposedActions.length} הצעות שיפור ממתינות לאישור`;

    return {
      summary,
      proposedActions,
      output: { analyzed, candidates: candidates.length, lookbackDays: LOOKBACK_DAYS },
      tokens,
      dedupKey: `conversation-analyst:${ctx.period}`,
    };
  },
};

/** Builds a compact transcript from the bot's most recent handoff conversation. */
function buildTranscript(
  s: BotStat,
  msgsByConv: Map<string, MsgRow[]>,
): string | null {
  const handoffIds = Array.from(s.handoffConvIds);
  const convId =
    handoffIds[handoffIds.length - 1] ??
    // no handoff: fall back to the longest conversation as a sample
    Array.from(msgsByConv.entries())
      .filter(([, m]) => m.some((x) => x.from_type !== "human"))
      .sort((a, b) => b[1].length - a[1].length)[0]?.[0];
  if (!convId) return null;
  const msgs = (msgsByConv.get(convId) ?? []).slice(-MAX_TRANSCRIPT_MSGS);
  if (msgs.length === 0) return null;
  const role = { customer: "לקוח", bot: "בוט", human: "נציג" } as const;
  return msgs.map((m) => `${role[m.from_type]}: ${m.body}`).join("\n");
}

const ANALYST_SYSTEM = `אתה אנליסט שיחות מומחה עבור פלטפורמת בוטים לוואטסאפ בעברית.
המטרה שלך: לזהות היכן הבוט נכשל בשיחה אמיתית ולהציע שיפור קונקרטי ומדויק.
אתה מחזיר אך ורק JSON תקין, ללא טקסט נוסף, במבנה:
{
  "diagnosis": "משפט-שניים בעברית: מה הבעיה העיקרית שזיהית",
  "promptAddition": "טקסט בעברית להוספה ל-system prompt של הבוט שיפתור את הבעיה (הנחיה אחת ברורה, לא הסבר)",
  "faqSuggestions": [{"question": "שאלה שחזרה ולא נענתה", "answer": "תשובה מוצעת"}]
}
כללים: אל תמציא מידע על העסק. אם אין שאלות נפוצות חסרות — החזר faqSuggestions ריק. שמור על עברית טבעית.`;

function analystPrompt(s: BotStat, transcript: string): string {
  const handoffRate =
    s.customer > 0 ? Math.round((s.human / (s.bot + s.human || 1)) * 100) : 0;
  const faqList =
    s.faq.length > 0
      ? s.faq.map((f) => `- ${f.question}`).join("\n")
      : "(אין שאלות נפוצות מוגדרות)";
  return `עסק: ${s.name} (בוט בשם ${s.bot_name})
נתוני השבוע: ${s.customer} הודעות לקוח, ${s.bot} תשובות בוט, ${s.human} מסירות לנציג (handoff ~${handoffRate}%).

שאלות נפוצות קיימות:
${faqList}

תמליל שיחה לדוגמה (כולל המקום שבו נדרשה התערבות):
${transcript}

נתח והחזר JSON לפי המבנה.`;
}
