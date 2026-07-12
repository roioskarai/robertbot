import { createAdminClient } from "@/lib/supabase/admin";
import { callClaude, extractJson, supabaseAdminConfigured } from "@/lib/agents/runner";
import { ASSISTANT_QUERIES, getQuery, ASSISTANT_QUERY_IDS } from "./queries";

// ── Admin AI assistant engine ──────────────────────────────────────────────
//
// Flow (safe by construction):
//   1. Claude picks ONE { queryId, params } from the fixed registry.
//   2. The chosen query's zod schema re-validates params — the model never
//      controls a raw value that reaches the DB.
//   3. The query runs (explicit selects, row caps, no secret columns).
//   4. Claude phrases a Hebrew answer strictly from the returned facts.
//   5. The whole turn is logged to agent_runs (agent: "admin-assistant") so
//      token spend is tracked for free.

export interface AssistantAnswer {
  answer: string;
  queryId: string | null;
  facts?: Record<string, string | number>;
  rows?: Record<string, unknown>[];
  tokens: number;
}

const INTENT_SYSTEM = `אתה מנתב שאלות עבור עוזר ניהול של Robert (SaaS ישראלי).
תפקידך: לבחור בדיוק שאילתה אחת מהרשימה שתענה על שאלת המנהל, ולחלץ פרמטרים.
אתה מחזיר אך ורק JSON תקין במבנה:
{ "queryId": "<id מהרשימה או null>", "params": { ... } }
אם אף שאילתה לא מתאימה — החזר queryId: null.
אל תמציא queryId שלא ברשימה. אל תמציא פרמטרים שלא מוגדרים.`;

function intentPrompt(question: string): string {
  const catalog = ASSISTANT_QUERIES
    .map((qr, i) => `${i + 1}. id="${qr.id}" — ${qr.labelHe}: ${qr.descriptionForIntent}`)
    .join("\n");
  return `שאלת המנהל: "${question}"

שאילתות זמינות:
${catalog}

בחר את המתאימה ביותר והחזר JSON.`;
}

const PHRASE_SYSTEM = `אתה עוזר ניהול של Robert. קיבלת נתונים אמיתיים מהמערכת.
נסח תשובה קצרה, ברורה ומדויקת בעברית על סמך הנתונים בלבד.
אל תמציא מספרים שלא קיבלת. 2-4 משפטים. בלי JSON, בלי כותרות.`;

function phrasePrompt(question: string, facts: Record<string, unknown>, rowCount: number): string {
  return `שאלת המנהל: "${question}"

נתונים מהמערכת:
${JSON.stringify(facts, null, 2)}
${rowCount ? `\n(בנוסף הוחזרו ${rowCount} שורות פירוט, מוצגות למנהל בנפרד.)` : ""}

כתוב את התשובה.`;
}

function suggestionsList(): string {
  return ASSISTANT_QUERIES.map((q) => `• ${q.labelHe}`).join("\n");
}

export async function answerQuestion(question: string): Promise<AssistantAnswer> {
  if (!supabaseAdminConfigured()) {
    return { answer: "העוזר אינו זמין במצב הדגמה (אין חיבור אמיתי למסד הנתונים).", queryId: null, tokens: 0 };
  }

  let tokens = 0;

  // 1. Intent → { queryId, params }
  let queryId: string | null = null;
  let rawParams: unknown = {};
  try {
    const { text, tokens: t } = await callClaude({
      system: INTENT_SYSTEM, prompt: intentPrompt(question), maxTokens: 300,
    });
    tokens += t;
    const parsed = extractJson<{ queryId: string | null; params?: unknown }>(text);
    queryId = parsed.queryId && ASSISTANT_QUERY_IDS.includes(parsed.queryId) ? parsed.queryId : null;
    rawParams = parsed.params ?? {};
  } catch {
    queryId = null;
  }

  const query = queryId ? getQuery(queryId) : undefined;
  if (!query) {
    return {
      answer: `לא מצאתי שאילתה מתאימה לשאלה הזו. אפשר לשאול אותי על:\n${suggestionsList()}`,
      queryId: null,
      tokens,
    };
  }

  // 2. Re-validate params (the model never controls raw values that hit the DB).
  const check = query.params.safeParse(rawParams);
  if (!check.success) {
    return {
      answer: `לא הצלחתי להבין את הפרטים לשאלה "${query.labelHe}". נסה לנסח מחדש, למשל עם טווח ימים או אימייל מדויק.`,
      queryId: query.id,
      tokens,
    };
  }

  // 3. Execute (safe query, capped rows).
  const db = createAdminClient();
  let result;
  try {
    result = await query.run(db, check.data);
  } catch (e) {
    await logRun(db, question, query.id, tokens, `error: ${e instanceof Error ? e.message : e}`);
    return { answer: "אירעה שגיאה בשליפת הנתונים. נסה שוב מאוחר יותר.", queryId: query.id, tokens };
  }

  // 4. Phrase the answer from facts only.
  let answer = "";
  try {
    const { text, tokens: t } = await callClaude({
      system: PHRASE_SYSTEM,
      prompt: phrasePrompt(question, result.facts, result.rows?.length ?? 0),
      maxTokens: 400,
    });
    tokens += t;
    answer = text.trim();
  } catch {
    // Fallback: a plain facts dump so the admin still gets the numbers.
    answer = Object.entries(result.facts).map(([k, v]) => `${k}: ${v}`).join(" · ");
  }

  // 5. Log the turn (token accounting for free).
  await logRun(db, question, query.id, tokens, undefined, { question, queryId: query.id, answer });

  return { answer, queryId: query.id, facts: result.facts, rows: result.rows, tokens };
}

async function logRun(
  db: ReturnType<typeof createAdminClient>,
  question: string,
  queryId: string | null,
  tokens: number,
  error?: string,
  output?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.from("agent_runs").insert({
      agent: "admin-assistant",
      status: error ? "error" : "success",
      mode: "live",
      period: new Date().toISOString().slice(0, 10),
      summary: question.slice(0, 120),
      output: output ?? null,
      error: error ?? null,
      tokens,
    });
  } catch {
    /* best-effort — never break the answer */
  }
}
