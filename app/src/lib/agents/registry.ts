import { conversationAnalyst } from "./conversation-analyst";
import { retention } from "./retention";
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

export function getAgent(name: string): Agent | null {
  return SCHEDULED_AGENTS[name] ?? null;
}

export const SCHEDULED_AGENT_NAMES = Object.keys(SCHEDULED_AGENTS);
