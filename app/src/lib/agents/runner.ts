import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnthropicKey } from "@/lib/claude";
import type { AgentMode, AgentName, AgentResult, AgentStatus } from "@/lib/types";

/**
 * Shared runtime for Robert's operational AI agents.
 *
 * Every agent is `run()` through here so it gets, for free:
 *  - a service-role Supabase client (agents read across tenants),
 *  - a single Claude call helper with token accounting,
 *  - persistence + audit into `agent_runs`,
 *  - idempotency via a per-run `dedupKey`,
 *  - graceful no-op when Supabase isn't configured (demo mode).
 *
 * Mirrors the demo-mode philosophy in app/CLAUDE.md and the cron pattern
 * in api/cron/trial/route.ts.
 */

const MODEL =
  process.env.ANTHROPIC_AGENT_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  "claude-sonnet-5";

export type AdminClient = ReturnType<typeof createAdminClient>;

/** True only when a real (non-placeholder) service-role Supabase config exists. */
export function supabaseAdminConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return (
    Boolean(url) &&
    !url.includes("placeholder") &&
    Boolean(key) &&
    !key.includes("placeholder")
  );
}

export interface AgentContext {
  supabase: AdminClient;
  /** "dry" = produce proposals only; "live" = the agent may perform side effects. */
  mode: AgentMode;
  now: Date;
  /** YYYY-MM-DD — used for daily idempotency. */
  period: string;
}

export interface Agent {
  name: AgentName;
  run(ctx: AgentContext): Promise<AgentResult>;
}

// ── Claude helper ─────────────────────────────────────────────

export interface ClaudeCall {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface ClaudeResult {
  text: string;
  tokens: number;
}

/** One-shot Claude call with token accounting. Throws if no API key. */
export async function callClaude({
  system,
  prompt,
  maxTokens = 1500,
}: ClaudeCall): Promise<ClaudeResult> {
  if (!hasAnthropicKey()) {
    throw new Error("ANTHROPIC_API_KEY חסר — לא ניתן להריץ סוכן AI");
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  const tokens = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0);
  return { text, tokens };
}

/**
 * Defensive JSON extraction — Claude sometimes wraps JSON in prose or code
 * fences. Tries a clean parse, then falls back to the first balanced
 * object/array slice. Throws (caller records the error) if nothing parses.
 */
export function extractJson<T = unknown>(raw: string): T {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through to slicing */
  }
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
  throw new Error("פלט ה-AI אינו JSON תקין");
}

// ── Runner ────────────────────────────────────────────────────

export interface RunOutcome {
  agent: AgentName;
  status: AgentStatus;
  mode: AgentMode;
  /** Hebrew summary line (success) or reason (skipped/error). */
  summary: string;
  runId?: string;
  result?: AgentResult;
}

/**
 * Runs one agent end-to-end: executes it, enforces idempotency, persists the
 * outcome to `agent_runs`, and returns a compact outcome for the orchestrator
 * / API response. Never throws — failures are recorded and returned.
 */
export async function runAgent(
  agent: Agent,
  mode: AgentMode = "dry",
): Promise<RunOutcome> {
  const now = new Date();
  const period = now.toISOString().slice(0, 10); // YYYY-MM-DD

  if (!supabaseAdminConfigured()) {
    return {
      agent: agent.name,
      status: "skipped",
      mode,
      summary: "Supabase לא מוגדר — דילוג (demo mode)",
    };
  }

  const supabase = createAdminClient();

  try {
    const result = await agent.run({ supabase, mode, now, period });

    // Idempotency: a matching dedup_key means we already ran for this period.
    if (result.dedupKey) {
      const { data: existing } = await supabase
        .from("agent_runs")
        .select("id")
        .eq("dedup_key", result.dedupKey)
        .maybeSingle();
      if (existing) {
        return {
          agent: agent.name,
          status: "skipped",
          mode,
          summary: "כבר רץ עבור התקופה הזו — דילוג",
          runId: existing.id,
        };
      }
    }

    const { data, error } = await supabase
      .from("agent_runs")
      .insert({
        agent: agent.name,
        status: "success",
        mode,
        user_id: result.userId ?? null,
        bot_id: result.botId ?? null,
        period,
        dedup_key: result.dedupKey ?? null,
        summary: result.summary,
        proposed_actions: result.proposedActions,
        output: result.output ?? null,
        tokens: result.tokens ?? 0,
      })
      .select("id")
      .single();
    if (error) throw error;

    return {
      agent: agent.name,
      status: "success",
      mode,
      summary: result.summary,
      runId: data?.id,
      result,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await supabase.from("agent_runs").insert({
        agent: agent.name,
        status: "error",
        mode,
        period,
        error: msg,
      });
    } catch {
      /* best-effort logging */
    }
    return { agent: agent.name, status: "error", mode, summary: `שגיאה: ${msg}` };
  }
}
