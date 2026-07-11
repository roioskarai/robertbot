import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseBody, agentActionDecisionSchema } from "@/lib/schemas";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAdminAudit } from "@/lib/admin-audit";
import { transitionAction } from "@/lib/agents/actions";
import type { FaqItem, ProposedAction } from "@/lib/types";

// POST /api/admin/agents/actions  { runId, actionIndex, decision }
// The ONLY write path for proposed_actions status transitions.
// "apply" executes bot-config drafts only (prompt_improvement / faq_addition);
// retention offers can never be applied by code — draft-only principle.

const MAX_CUSTOM_INSTRUCTIONS = 4000;

async function applySideEffect(
  db: ReturnType<typeof createAdminClient>,
  action: ProposedAction,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!action.target) return { ok: false, error: "להצעה אין בוט יעד" };

  const { data: bot, error } = await db
    .from("bots")
    .select("id, name, faq, custom_instructions")
    .eq("id", action.target)
    .maybeSingle();
  if (error || !bot) return { ok: false, error: "הבוט לא נמצא (ייתכן שנמחק)" };

  if (action.type === "prompt_improvement") {
    const addition = String(action.payload?.promptAddition ?? "").trim();
    if (!addition) return { ok: false, error: "ההצעה ריקה" };
    const current = (bot.custom_instructions as string | null) ?? "";
    const combined = current ? `${current}\n---\n${addition}` : addition;
    if (combined.length > MAX_CUSTOM_INSTRUCTIONS) {
      return { ok: false, error: "ההנחיות המותאמות של הבוט מלאות — נקה אותן בעורך הבוט לפני החלה" };
    }
    const { error: upErr } = await db
      .from("bots").update({ custom_instructions: combined }).eq("id", bot.id);
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true };
  }

  if (action.type === "faq_addition") {
    const items = Array.isArray(action.payload?.items) ? (action.payload.items as FaqItem[]) : [];
    const valid = items.filter((f) => f?.question?.trim() && f?.answer?.trim());
    if (!valid.length) return { ok: false, error: "ההצעה ריקה" };
    const existing = Array.isArray(bot.faq) ? (bot.faq as FaqItem[]) : [];
    const known = new Set(existing.map((f) => f.question.trim()));
    const added = valid.filter((f) => !known.has(f.question.trim()));
    if (!added.length) return { ok: false, error: "כל השאלות כבר קיימות בבוט" };
    const { error: upErr } = await db
      .from("bots").update({ faq: [...existing, ...added] }).eq("id", bot.id);
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true };
  }

  return { ok: false, error: "סוג הצעה לא נתמך להחלה" };
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  if (!rateLimit(`agent-actions:${clientKey(req)}`, 12, 60_000).allowed) {
    return jsonError("יותר מדי פעולות. נסה שוב בעוד דקה.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(agentActionDecisionSchema, body);
  if (!parsed.ok) return jsonError(parsed.message);
  const { runId, actionIndex, decision } = parsed.data;

  const db = createAdminClient();
  const { data: run } = await db
    .from("agent_runs")
    .select("id, agent, proposed_actions")
    .eq("id", runId)
    .maybeSingle();
  if (!run) return jsonError("הריצה לא נמצאה", 404);

  const actions = Array.isArray(run.proposed_actions)
    ? (run.proposed_actions as ProposedAction[])
    : [];
  const t = transitionAction(actions, actionIndex, decision);
  if (!t.ok) return jsonError(t.error, 400);

  // Apply performs the side effect FIRST; only a successful apply is recorded.
  if (decision === "apply") {
    const applied = await applySideEffect(db, t.action);
    if (!applied.ok) return jsonError(applied.error, 400);
  }

  const { error: saveErr } = await db
    .from("agent_runs")
    .update({ proposed_actions: t.actions })
    .eq("id", runId);
  if (saveErr) return jsonError(saveErr.message, 500);

  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: `agent.action_${decision === "approve" ? "approve" : decision === "dismiss" ? "dismiss" : "apply"}`,
    target_type: t.action.type === "retention_offer" ? "user" : "bot",
    target_id: t.action.target,
    target_label: t.action.label?.slice(0, 160),
    meta: { runId, actionIndex, agent: run.agent, type: t.action.type },
  });

  return NextResponse.json({ ok: true, action: t.action });
}
