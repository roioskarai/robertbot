-- 0015_wa_connection_events.sql
-- Diagnostic log for WhatsApp connection failures (OTP send/check + message
-- send). Powers the admin /admin/insights screen so the owner can see the exact
-- Twilio error code + a Hebrew reason WITHOUT digging through server logs.
-- Written best-effort from application code (a failed insert never blocks the
-- connect flow — same decoupled pattern as wa_connection_status in 0014).
-- GATED: do not apply without APPROVED - DATABASE from the owner.

CREATE TABLE IF NOT EXISTS wa_connection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  scope TEXT NOT NULL CHECK (scope IN ('bot-connect', 'onboarding', 'send', 'check')),
  twilio_code INTEGER,                 -- raw Twilio error code (e.g. 21608), null if not a Twilio error
  kind TEXT,                           -- mapped WaErrorKind: config|user|rate|unknown
  phone_masked TEXT,                   -- last 4 digits only — never the full number
  message_he TEXT,                     -- the Hebrew reason surfaced to the user
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wa_connection_events_created_idx ON wa_connection_events(created_at DESC);
CREATE INDEX IF NOT EXISTS wa_connection_events_bot_idx ON wa_connection_events(bot_id, created_at DESC);

-- Admin-only visibility. Inserts come from the service-role admin client, which
-- bypasses RLS; tenants must never read another tenant's connection failures.
ALTER TABLE wa_connection_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_wa_events" ON wa_connection_events;
CREATE POLICY "admin_read_wa_events" ON wa_connection_events
  FOR SELECT USING (is_admin());
