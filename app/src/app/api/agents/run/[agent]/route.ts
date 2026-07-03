import { NextResponse } from "next/server";
import { getAgent, SCHEDULED_AGENT_NAMES } from "@/lib/agents/registry";
import { runAgent } from "@/lib/agents/runner";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import type { AgentMode } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ agent: string }> };

// GET /api/agents/run/[agent]?secret=...&mode=dry|live
// Secret-guarded (Vercel Cron / manual). `agent` is "orchestrator" or any
// name in SCHEDULED_AGENT_NAMES. `mode=dry` (default) returns proposals only.
export async function GET(req: Request, props: Ctx) {
  const params = await props.params;
  const url = new URL(req.url);
  // Accept the secret via query, custom header, or Vercel Cron's
  // `Authorization: Bearer <CRON_SECRET>` (auto-sent when CRON_SECRET is set).
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const secret =
    url.searchParams.get("secret") || req.headers.get("x-cron-secret") || bearer;
  // Fail-closed: if CRON_SECRET is set, it must match; if it's not set outside of
  // demo mode, also reject — prevents open access on misconfigured deployments.
  const cronSecret = process.env.CRON_SECRET;
  const isDemoMode = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes("placeholder");
  if (!isDemoMode && (!cronSecret || secret !== cronSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const mode: AgentMode = url.searchParams.get("mode") === "live" ? "live" : "dry";
  const name = params.agent;

  if (name === "orchestrator") {
    const r = await runOrchestrator(mode);
    return NextResponse.json({
      ok: true,
      agent: "orchestrator",
      mode,
      totalProposals: r.totalProposals,
      emailed: r.emailed,
      ran: r.ran.map((o) => ({
        agent: o.agent,
        status: o.status,
        summary: o.summary,
        proposals: o.result?.proposedActions.length ?? 0,
      })),
    });
  }

  const agent = getAgent(name);
  if (!agent) {
    return NextResponse.json(
      { error: `סוכן לא קיים: ${name}`, available: ["orchestrator", ...SCHEDULED_AGENT_NAMES] },
      { status: 404 },
    );
  }

  const outcome = await runAgent(agent, mode);
  return NextResponse.json({ ok: outcome.status !== "error", ...outcome });
}
