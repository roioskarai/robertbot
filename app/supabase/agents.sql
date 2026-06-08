-- ════════════════════════════════════════════════════════════
-- Robert — AI agent layer (operational agents)
-- Run AFTER schema.sql in the Supabase SQL editor. Safe to re-run.
--
-- `agent_runs` is the audit log + draft store for every operational
-- agent (conversation-analyst, retention, orchestrator, …). It makes
-- the agents reliable: idempotent, reviewable, and reversible.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,                       -- registry name: "conversation-analyst", ...
  status TEXT NOT NULL DEFAULT 'success'     -- outcome of the run
    CHECK (status IN ('success', 'error', 'skipped')),
  mode TEXT NOT NULL DEFAULT 'dry'           -- 'dry' = proposal only; 'live' = side effects executed
    CHECK (mode IN ('dry', 'live')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- tenant scope; NULL = platform-wide (admin only)
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,    -- optional finer scope
  period TEXT,                               -- "2026-06-07" (daily) / "2026-06" (monthly) for idempotency
  dedup_key TEXT UNIQUE,                      -- e.g. "conversation-analyst:<bot_id>:2026-06-07" — guards double-runs
  summary TEXT,                              -- one-line Hebrew summary for the owner report
  proposed_actions JSONB DEFAULT '[]',       -- [{type, target, payload, status:'pending'|'approved'|'applied'|'dismissed'}]
  output JSONB,                              -- full structured result from the agent
  error TEXT,                                -- populated when status = 'error'
  tokens INT DEFAULT 0,                      -- Claude tokens consumed (cost tracking)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_runs_agent_idx   ON agent_runs(agent, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_user_idx    ON agent_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_pending_idx ON agent_runs(user_id) WHERE status = 'success';

-- ── RLS ──────────────────────────────────────────────────────
-- Tenants see runs about their own data (e.g. proposed prompt
-- improvements they must approve). Platform-wide runs (user_id NULL)
-- are admin-only. Writes happen via the service-role admin client.
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_own_agent_runs" ON agent_runs;
CREATE POLICY "tenant_own_agent_runs" ON agent_runs
  FOR ALL USING (user_id = auth.uid() OR is_admin());
