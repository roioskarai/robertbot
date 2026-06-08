import { createAdminClient } from "@/lib/supabase/admin";
import { dailyOwnerReportEmail, hasResendKey, sendEmail } from "@/lib/resend";
import type { AgentMode } from "@/lib/types";
import { SCHEDULED_AGENTS } from "./registry";
import { runAgent, supabaseAdminConfigured, type RunOutcome } from "./runner";

/**
 * ops-orchestrator — the daily heartbeat. Runs every scheduled operational
 * agent in sequence, compiles a single Hebrew owner report, and (in live mode,
 * if RESEND + OWNER_EMAIL are configured) emails it. Records its own summary
 * row in `agent_runs`.
 *
 * Triggered by Vercel Cron via GET /api/agents/run/orchestrator (see vercel.json).
 */

export interface OrchestratorResult {
  ran: RunOutcome[];
  reportHtml: string;
  emailed: boolean;
  totalProposals: number;
}

export async function runOrchestrator(
  mode: AgentMode = "dry",
): Promise<OrchestratorResult> {
  const ran: RunOutcome[] = [];
  for (const name of Object.keys(SCHEDULED_AGENTS)) {
    ran.push(await runAgent(SCHEDULED_AGENTS[name], mode));
  }

  const totalProposals = ran.reduce(
    (n, o) => n + (o.result?.proposedActions.length ?? 0),
    0,
  );

  const { subject, html } = dailyOwnerReportEmail({
    date: new Date().toLocaleDateString("he-IL"),
    items: ran.map((o) => ({
      agent: o.agent,
      status: o.status,
      summary: o.summary,
      proposals: o.result?.proposedActions.length ?? 0,
    })),
  });

  let emailed = false;
  const owner = process.env.OWNER_EMAIL;
  if (mode === "live" && owner && hasResendKey()) {
    try {
      await sendEmail(owner, subject, html);
      emailed = true;
    } catch {
      /* report send is best-effort */
    }
  }

  if (supabaseAdminConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("agent_runs").insert({
        agent: "orchestrator",
        status: "success",
        mode,
        period: new Date().toISOString().slice(0, 10),
        summary: `הורצו ${ran.length} סוכנים · ${totalProposals} הצעות ממתינות`,
        output: {
          emailed,
          ran: ran.map((o) => ({
            agent: o.agent,
            status: o.status,
            summary: o.summary,
          })),
        },
      });
    } catch {
      /* best-effort logging */
    }
  }

  return { ran, reportHtml: html, emailed, totalProposals };
}
