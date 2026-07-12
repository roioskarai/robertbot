import { NextResponse } from "next/server";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseBody, assistantAskSchema } from "@/lib/schemas";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { hasAnthropicKey } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAudit } from "@/lib/admin-audit";
import { answerQuestion } from "@/lib/admin-assistant/engine";
import { isFeatureEnabled } from "@/lib/feature-flags";

// POST /api/admin/assistant  { question }
// Predefined-safe-query assistant. Rate-limited to cap token spend.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  if (!(await isFeatureEnabled("ai_assistant"))) {
    return jsonError("עוזר ה-AI מושבת כרגע", 403);
  }
  if (!rateLimit(`admin-assistant:${clientKey(req)}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי שאלות. נסה שוב בעוד דקה.", 429);
  }
  if (!hasAnthropicKey()) {
    return jsonError("עוזר ה-AI אינו זמין — חסר מפתח Anthropic", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(assistantAskSchema, body);
  if (!parsed.ok) return jsonError(parsed.message);

  const result = await answerQuestion(parsed.data.question);

  await logAdminAudit(createAdminClient(), {
    actor_id: session.authId,
    actor_email: session.email,
    action: "assistant.ask",
    target_type: "system",
    meta: { question: parsed.data.question.slice(0, 200), queryId: result.queryId, ip: clientKey(req) },
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
