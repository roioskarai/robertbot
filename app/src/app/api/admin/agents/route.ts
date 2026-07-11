import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminAudit } from "@/lib/admin-audit";
import { getAgent, SCHEDULED_AGENT_NAMES } from "@/lib/agents/registry";
import { runAgent } from "@/lib/agents/runner";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import type { AgentMode } from "@/lib/types";

// GET /api/admin/agents — recent agent runs + proposed actions.
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();
  const { data: runs } = await db
    .from("agent_runs")
    .select("id, agent, status, mode, summary, proposed_actions, tokens, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return NextResponse.json({ runs: runs ?? [], available: ["orchestrator", ...SCHEDULED_AGENT_NAMES] });
}

// POST /api/admin/agents  { agent, mode } — trigger an agent or the orchestrator.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  let body: { agent?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const mode: AgentMode = body.mode === "live" ? "live" : "dry";

  await logAdminAudit(createAdminClient(), {
    actor_id: session.authId,
    actor_email: session.email,
    action: "agent.trigger",
    target_type: "agent",
    target_id: body.agent,
    target_label: body.agent,
    meta: { mode },
  });

  try {
    if (body.agent === "orchestrator") {
      const result = await runOrchestrator(mode);
      return NextResponse.json({ ok: true, result });
    }
    const agent = body.agent ? getAgent(body.agent) : null;
    if (!agent) return jsonError("סוכן לא חוקי", 400);
    const outcome = await runAgent(agent, mode);
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "הרצת הסוכן נכשלה", 500);
  }
}
