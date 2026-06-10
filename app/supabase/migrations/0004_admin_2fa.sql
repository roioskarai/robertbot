-- ════════════════════════════════════════════════════════════
-- Migration 0004 — Admin panel + 2FA (TOTP / Google Authenticator)
-- Run AFTER schema.sql. Idempotent.
-- ════════════════════════════════════════════════════════════

-- 2FA columns on users (secret stored ENCRYPTED via lib/crypto.ts).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,  -- admin can suspend a tenant
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Promote the owner to admin (applies immediately if already signed up).
UPDATE users SET role = 'admin' WHERE email = 'roioskarai@gmail.com';

-- Auto-assign admin role on signup for the owner email (covers first signup).
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    CASE WHEN NEW.email = 'roioskarai@gmail.com' THEN 'admin' ELSE 'tenant' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic helpers used by the message pipeline (fixes read-then-write races).
CREATE OR REPLACE FUNCTION decrement_pack_balance(uid UUID) RETURNS void AS $$
  UPDATE users SET pack_balance = GREATEST(0, pack_balance - 1) WHERE id = uid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_usage(uid UUID, bid UUID, p TEXT) RETURNS void AS $$
  INSERT INTO usage_logs (user_id, bot_id, period, message_count)
  VALUES (uid, bid, p, 1)
  ON CONFLICT (user_id, bot_id, period)
  DO UPDATE SET message_count = usage_logs.message_count + 1;
$$ LANGUAGE sql;
