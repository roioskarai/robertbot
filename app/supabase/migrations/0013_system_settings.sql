-- ============================================================
-- system_settings: a small key-value store for OPERATIONAL system config
-- (maintenance mode, feature flags) -- kept separate from site_settings,
-- which holds public website content (draft/published docs).
--
-- Reads are admin-only via RLS. There is NO write policy, so authenticated
-- and anon cannot INSERT/UPDATE/DELETE even with table grants (same posture
-- as payment_events / the 0012 hardening). Every write goes through the
-- service-role admin client after requireAdmin() + an admin-audit entry.
--
-- The app feature-detects this table (isMissingTableError) and falls back to
-- safe defaults (maintenance OFF, flags at their code-defined defaults) until
-- this migration is applied, so shipping the code before the DB is safe.
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,               -- 'maintenance' | 'feature_flags'
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_system" ON system_settings;
CREATE POLICY "admin_read_system" ON system_settings
  FOR SELECT USING (is_admin());

-- Belt-and-suspenders: never let the tenant/anon roles write this table.
REVOKE INSERT, UPDATE, DELETE ON system_settings FROM authenticated, anon;
