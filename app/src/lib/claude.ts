import Anthropic from "@anthropic-ai/sdk";
import type { Bot, WorkingHours, FromType } from "./types";

// claude-sonnet-4-20250514 retired 2026-06-15 → replaced per the official
// migration guide with claude-sonnet-5 (same tier, near-Opus quality).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const DAY_LABELS_HE: Record<keyof WorkingHours, string> = {
  sun: "ראשון",
  mon: "שני",
  tue: "שלישי",
  wed: "רביעי",
  thu: "חמישי",
  fri: "שישי",
  sat: "שבת",
};

const DAY_ORDER: (keyof WorkingHours)[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export function formatWorkingHours(hours: WorkingHours | null): string {
  if (!hours) return "לא צוינו שעות פעילות";
  return DAY_ORDER.map((d) => {
    const day = hours[d];
    const label = DAY_LABELS_HE[d];
    if (!day || day.closed) return `${label}: סגור`;
    return `${label}: ${day.open}–${day.close}`;
  }).join("\n");
}

/**
 * Builds the dynamic system prompt from a bot's configuration.
 * Mirrors the spec in the master prompt (Hebrew-first, quick-reply
 * buttons, appointment flow, handoff rules, FAQ).
 */
export function buildSystemPrompt(bot: Bot): string {
  const services = (bot.services || [])
    .map((s) => `- ${s.name}: ${s.price}`)
    .join("\n");

  const faq = (bot.faq || [])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const styleLine =
    bot.style === "friendly"
      ? "Warm, friendly, use emojis occasionally"
      : bot.style === "professional"
        ? "Professional and formal, no emojis"
        : "Short and to the point";

  return `
You are ${bot.bot_name}, the virtual assistant for ${bot.name}.

BUSINESS INFO:
${bot.description || ""}

SERVICES & PRICING:
${services}

WORKING HOURS:
${formatWorkingHours(bot.working_hours)}

ADDRESS: ${bot.address || ""}

COMMUNICATION STYLE: ${styleLine}

LANGUAGE: Always respond in Hebrew (עברית) unless the customer writes in another language.

RULES:
1. Always offer quick-reply buttons when possible (format: [BUTTONS: option1 | option2 | option3])
2. For appointment booking: first ask service → then offer 5 available dates → then show available times for chosen date
3. If you cannot answer a question, transfer to human: [HANDOFF]
4. Never make up prices or services not listed above
5. Keep responses concise — mobile users don't like long texts
6. After 2 failed attempts to understand, trigger [HANDOFF]

FAQ:
${faq}
`.trim();
}

export interface HistoryMessage {
  from_type: FromType;
  body: string;
}

export interface BotReply {
  text: string; // reply with control tokens stripped
  buttons: string[]; // parsed from [BUTTONS: a | b | c]
  handoff: boolean; // true if [HANDOFF] was present
}

/** Extracts [BUTTONS: ...] and [HANDOFF] tokens from a raw model reply. */
export function parseBotReply(raw: string): BotReply {
  let text = raw;
  let buttons: string[] = [];
  let handoff = false;

  const btnMatch = text.match(/\[BUTTONS:\s*([^\]]+)\]/i);
  if (btnMatch) {
    buttons = btnMatch[1]
      .split("|")
      .map((b) => b.trim())
      .filter(Boolean);
    text = text.replace(btnMatch[0], "").trim();
  }

  if (/\[HANDOFF\]/i.test(text)) {
    handoff = true;
    text = text.replace(/\[HANDOFF\]/gi, "").trim();
  }

  return { text, buttons, handoff };
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Generates a bot reply via Claude. Used by both the WhatsApp webhook
 * and the live preview. Throws if no API key is configured.
 */
export async function generateReply(
  bot: Bot,
  history: HistoryMessage[],
  userMessage: string,
): Promise<BotReply> {
  if (!hasAnthropicKey()) {
    throw new Error("ANTHROPIC_API_KEY חסר — לא ניתן להפעיל את מנוע ה-AI");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [];
  for (const m of history) {
    messages.push({
      role: m.from_type === "customer" ? "user" : "assistant",
      content: m.body,
    });
  }
  messages.push({ role: "user", content: userMessage });

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(bot),
    messages,
  });

  const raw = res.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  return parseBotReply(raw);
}
