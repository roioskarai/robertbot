-- ════════════════════════════════════════════════════════════
-- Migration 0002 — multi-tenant WhatsApp / WABA isolation
-- Run AFTER schema.sql on an existing project. Idempotent.
-- Each tenant owns its own Meta Portfolio + WABA (Embedded Signup), so a ban
-- on one tenant's number never affects another. Tokens are per-tenant.
-- ════════════════════════════════════════════════════════════

ALTER TABLE bots
  ADD COLUMN IF NOT EXISTS wa_provider TEXT CHECK (wa_provider IN ('twilio', 'meta')),
  ADD COLUMN IF NOT EXISTS meta_business_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_waba_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS wa_access_token TEXT;

CREATE INDEX IF NOT EXISTS bots_meta_phone_idx ON bots(meta_phone_number_id);
