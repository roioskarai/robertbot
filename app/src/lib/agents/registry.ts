import { conversationAnalyst } from "./conversation-analyst";
import { retention } from "./retention";
import { weeklyReport } from "./weekly-report";
import type { Agent } from "./runner";

/**
 * Schedulable operational agents — the ones the orchestrator runs daily and
 * that `/api/agents/run/[agent]` can trigger by name.
 *
 * Not listed here:
 *  - "orchestrator" — coordinates the agents below (see orchestrator.ts).
 *  - "knowledge" — interactive/tenant-facing; called from onboarding via
 *    POST /api/agents/knowledge, not on a schedule.
 */
export const SCHEDULED_AGENTS: Record<string, Agent> = {
  "conversation-analyst": conversationAnalyst,
  retention,
};

/**
 * Weekly agents — run by the orchestrator only on Sunday (UTC). Their
 * ISO-week dedup_key makes accidental double-runs a no-op.
 */
export const WEEKLY_AGENTS: Record<string, Agent> = {
  "weekly-report": weeklyReport,
};

export function getAgent(name: string): Agent | null {
  return SCHEDULED_AGENTS[name] ?? WEEKLY_AGENTS[name] ?? null;
}

export const SCHEDULED_AGENT_NAMES = Object.keys(SCHEDULED_AGENTS);
export const WEEKLY_AGENT_NAMES = Object.keys(WEEKLY_AGENTS);
