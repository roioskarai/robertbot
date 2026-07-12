-- ============================================================
-- Close self-escalation vector on users/usage_logs/bots/agent_runs.
--
-- Root cause: "FOR ALL USING (...)" policies with no WITH CHECK, combined
-- with Supabase's default broad table GRANTs to authenticated/anon, let a
-- signed-in tenant UPDATE their own users row with an arbitrary payload
-- (role, plan, subscription_status, pack_balance, is_comp, ...) -- the
-- USING clause is satisfied both before and after the write, so nothing
-- blocked it. Same shape on usage_logs (quota reset) and bots (ownership
-- transfer via user_id).
--
-- Fix: the app already writes users/usage_logs/agent_runs exclusively
-- through the service-role admin client after server-side authorization
-- (confirmed by code audit -- see the 0012 companion code changes to
-- billing/cancel|pause|downgrade|checkout, the only remaining routes that
-- used the tenant's own session client for a users write). So REVOKE
-- table-level write privileges from authenticated/anon entirely for those
-- three tables -- service_role is a separate Postgres role and is
-- unaffected. bots keeps tenant writes (dashboard bot create/edit is
-- legitimately client-side) but gains WITH CHECK so an update can no
-- longer move a bot to a different user_id.
-- ============================================================

REVOKE INSERT, UPDATE, DELETE ON users       FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON usage_logs  FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON agent_runs  FROM authenticated, anon;

DROP POLICY IF EXISTS "user_own_row" ON users;
CREATE POLICY "user_own_row" ON users
  FOR ALL USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "tenant_own_usage" ON usage_logs;
CREATE POLICY "tenant_own_usage" ON usage_logs
  FOR ALL USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "tenant_own_agent_runs" ON agent_runs;
CREATE POLICY "tenant_own_agent_runs" ON agent_runs
  FOR ALL USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "tenant_own_bots" ON bots;
CREATE POLICY "tenant_own_bots" ON bots
  FOR ALL USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());
