-- 0014_wa_connection_status.sql
-- Adds honest WhatsApp connection status tracking to bots, decoupled from the
-- existing whatsapp_number/active/wa_provider columns (written via a separate,
-- best-effort update in application code — see app/CLAUDE.md agent layer notes).
-- GATED: do not apply without APPROVED - DATABASE from the owner.

ALTER TABLE bots ADD COLUMN IF NOT EXISTS wa_connection_status TEXT
  NOT NULL DEFAULT 'disconnected'
  CHECK (wa_connection_status IN ('disconnected', 'pending_verification', 'connected', 'error'));
ALTER TABLE bots ADD COLUMN IF NOT EXISTS wa_last_error TEXT;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS wa_connected_at TIMESTAMPTZ;

-- Backfill: any bot that already has a number and is active is presumed connected.
UPDATE bots SET wa_connection_status = 'connected',
                wa_connected_at = COALESCE(wa_connected_at, updated_at)
  WHERE whatsapp_number IS NOT NULL AND active = true;
