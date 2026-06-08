import type { FaqItem, Service } from "@/lib/types";
import { callClaude, extractJson } from "./runner";

/**
 * knowledge — the product agent that powers the "10-minute bot" promise.
 *
 * Given a free-text description of a business (pasted by the owner during
 * onboarding, or scraped from their site), it learns the business and drafts
 * the three fields that are tedious to fill by hand:
 *   - `description` (the AI-context paragraph)
 *   - `services`    ([{name, price}])
 *   - `faq`         ([{question, answer}])
 *
 * It is suggestion-only: onboarding presents the output for the owner to edit
 * before saving the bot. Pure function — no DB writes here.
 */

export interface KnowledgeInput {
  /** Raw business info: pasted text, "about" page content, etc. */
  text: string;
  /** Optional category to anchor tone & typical services (e.g. "מספרה"). */
  businessType?: string;
  businessName?: string;
}

export interface KnowledgeResult {
  description: string;
  services: Service[];
  faq: FaqItem[];
  tokens: number;
}

const MAX_INPUT_CHARS = 8000;

export async function extractBusinessKnowledge(
  input: KnowledgeInput,
): Promise<KnowledgeResult> {
  const text = (input.text || "").slice(0, MAX_INPUT_CHARS).trim();
  if (!text) {
    return { description: "", services: [], faq: [], tokens: 0 };
  }

  const { text: raw, tokens } = await callClaude({
    system: KNOWLEDGE_SYSTEM,
    prompt: knowledgePrompt(input, text),
    maxTokens: 1500,
  });

  const parsed = extractJson<{
    description?: string;
    services?: Service[];
    faq?: FaqItem[];
  }>(raw);

  return {
    description: (parsed.description ?? "").trim(),
    services: sanitizeServices(parsed.services),
    faq: sanitizeFaq(parsed.faq),
    tokens,
  };
}

function sanitizeServices(s: Service[] | undefined): Service[] {
  if (!Array.isArray(s)) return [];
  return s
    .filter((x) => x && typeof x.name === "string" && x.name.trim())
    .slice(0, 20)
    .map((x) => ({
      name: String(x.name).trim(),
      price: x.price != null ? String(x.price).trim() : "",
    }));
}

function sanitizeFaq(f: FaqItem[] | undefined): FaqItem[] {
  if (!Array.isArray(f)) return [];
  return f
    .filter(
      (x) =>
        x &&
        typeof x.question === "string" &&
        x.question.trim() &&
        typeof x.answer === "string" &&
        x.answer.trim(),
    )
    .slice(0, 15)
    .map((x) => ({ question: x.question.trim(), answer: x.answer.trim() }));
}

const KNOWLEDGE_SYSTEM = `אתה עוזר הקמה של בוט וואטסאפ לעסק ישראלי קטן.
מתוך תיאור חופשי של העסק אתה מפיק שלושה שדות מובנים, בעברית טבעית.
אתה מחזיר אך ורק JSON תקין, ללא טקסט נוסף, במבנה:
{
  "description": "פסקה קצרה (2-4 משפטים) שמתארת את העסק ללקוחות — תשמש את הבוט כהקשר",
  "services": [{"name": "שם השירות", "price": "₪מחיר או '' אם לא ידוע"}],
  "faq": [{"question": "שאלה שלקוח עשוי לשאול", "answer": "תשובה קצרה"}]
}
כללים קריטיים:
- אל תמציא מחירים, שירותים או פרטים שלא הופיעו בטקסט. אם מחיר לא צוין — השאר "" .
- צור 3-6 שאלות נפוצות הגיוניות לסוג העסק, בהתבסס על המידע שניתן בלבד.
- שמור על עברית תקנית וקצרה. אל תשתמש ב-placeholders.`;

function knowledgePrompt(input: KnowledgeInput, text: string): string {
  const ctx = [
    input.businessName ? `שם העסק: ${input.businessName}` : "",
    input.businessType ? `סוג העסק: ${input.businessType}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `${ctx ? ctx + "\n\n" : ""}תיאור חופשי של העסק:
"""
${text}
"""

הפק את ה-JSON לפי המבנה.`;
}
