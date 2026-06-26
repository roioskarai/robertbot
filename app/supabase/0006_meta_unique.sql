-- ════════════════════════════════════════════════════════════
-- Robert — 0006: cross-tenant uniqueness for Meta phone-number id
-- Run in the Supabase SQL editor AFTER schema.sql.
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════

-- One Meta sender phone-number id per tenant connection (race-proof backstop
-- for the app-level check in api/bots/[id]/connect-meta). Partial so bots that
-- aren't connected via Meta (meta_phone_number_id IS NULL) stay unrestricted.
-- Mirrors bots_whatsapp_unique on whatsapp_number.
CREATE UNIQUE INDEX IF NOT EXISTS bots_meta_phone_unique
  ON bots (meta_phone_number_id)
  WHERE meta_phone_number_id IS NOT NULL;
