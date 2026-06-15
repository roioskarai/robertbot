-- ════════════════════════════════════════════════════════════
-- 0005 — Launch hardening
-- Run in the Supabase SQL editor (after 0001–0004).
--   1. Enforce one WhatsApp number per tenant at the DB level (race-proof).
--   2. Payment-webhook idempotency table (prevents double-credit on retries).
--   3. Cancel-at-period-end columns (keep service until the paid period ends).
-- ════════════════════════════════════════════════════════════

-- 1. A WhatsApp number can belong to at most one bot. Partial index so many
--    unconnected bots (whatsapp_number IS NULL) are still allowed.
CREATE UNIQUE INDEX IF NOT EXISTS bots_whatsapp_unique
  ON bots (whatsapp_number)
  WHERE whatsapp_number IS NOT NULL;

-- 2. Idempotency ledger for payment webhooks. The provider's unique event/
--    transaction id is the primary key; a second delivery of the same event is
--    a no-op (INSERT ... ON CONFLICT DO NOTHING in applyPaymentEvent).
CREATE TABLE IF NOT EXISTS payment_events (
  event_id   TEXT PRIMARY KEY,
  event_type TEXT,
  user_id    UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Service-role only: enable RLS with NO policies → anon/auth clients get zero
-- rows; the webhook (service role) bypasses RLS. Never exposed to tenants.
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- 3. Cancel-at-period-end. On cancel we keep subscription_status='active' and
--    set cancel_at_period_end=true; the daily cron deactivates once
--    subscription_ends_at has passed. subscription_ends_at is refreshed on each
--    successful charge.
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
