-- ════════════════════════════════════════════════════════════
-- Robert — Supabase schema (tables + RLS)
-- Run in the Supabase SQL editor on a fresh project.
-- Core tables/policies are verbatim from the master prompt;
-- a few functional columns are added (marked "ADDED").
-- ════════════════════════════════════════════════════════════

-- ── Users / Tenants ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'tenant' CHECK (role IN ('admin', 'tenant')),
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'business', 'enterprise')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'paused')),
  payment_provider TEXT CHECK (payment_provider IN ('grow', 'stripe')), -- ADDED: active billing provider
  payment_customer_id TEXT,               -- ADDED: provider-agnostic customer id
  payment_subscription_id TEXT,           -- ADDED: provider-agnostic subscription/recurring id
  stripe_customer_id TEXT,                -- legacy (kept for backward compat)
  stripe_subscription_id TEXT,            -- legacy (kept for backward compat)
  pack_balance INT DEFAULT 0,             -- ADDED: never-expiring message pack balance
  trial_reminder_sent BOOLEAN DEFAULT false, -- ADDED: day-5 trial email guard
  totp_secret TEXT,                       -- ADDED: 2FA secret (encrypted via lib/crypto.ts)
  totp_enabled BOOLEAN DEFAULT false,     -- ADDED: 2FA active flag
  is_suspended BOOLEAN DEFAULT false,     -- ADDED: admin can suspend a tenant
  last_login_at TIMESTAMPTZ,              -- ADDED: last successful login
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The id mirrors auth.users.id so RLS via auth.uid() works.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE users
  ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── Bots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- Business name: "מספרת מיטל"
  bot_name TEXT NOT NULL,          -- Bot display name in WhatsApp: "מיטל"
  business_type TEXT,              -- Category: "beauty", "food", etc.
  business_subtype TEXT,           -- Subcategory: "ספר / מספרה"
  description TEXT,                -- Business description for AI context
  services JSONB DEFAULT '[]',     -- [{name, price}]
  working_hours JSONB,             -- {sun:{open,close,closed}, mon:...}
  address TEXT,
  phone TEXT,
  style TEXT DEFAULT 'friendly' CHECK (style IN ('friendly', 'professional', 'short')),
  whatsapp_number TEXT,
  twilio_sid TEXT,
  -- WhatsApp connection (multi-tenant isolation). Each tenant owns its own
  -- Meta Portfolio + WABA via Embedded Signup; tokens are per-tenant.
  wa_provider TEXT CHECK (wa_provider IN ('twilio', 'meta')), -- ADDED
  meta_business_id TEXT,        -- ADDED: tenant's Meta Business Portfolio id
  meta_waba_id TEXT,            -- ADDED: tenant's WhatsApp Business Account id
  meta_phone_number_id TEXT,    -- ADDED: tenant's sender phone-number id (inbound routing)
  wa_access_token TEXT,         -- ADDED: tenant's WABA access token (store encrypted)
  active BOOLEAN DEFAULT false,
  system_prompt TEXT,              -- Generated AI system prompt
  message_templates JSONB,         -- Custom templates chosen by tenant
  faq JSONB DEFAULT '[]',          -- [{question, answer}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bots_whatsapp_idx ON bots(whatsapp_number);
CREATE INDEX IF NOT EXISTS bots_meta_phone_idx ON bots(meta_phone_number_id);

-- ── Conversations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status TEXT DEFAULT 'bot' CHECK (status IN ('bot', 'human', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  from_type TEXT CHECK (from_type IN ('customer', 'bot', 'human')),
  body TEXT NOT NULL,
  provider_message_id TEXT UNIQUE,  -- ADDED: webhook idempotency / dedup (Twilio SID or Meta wamid)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Usage logs (for billing) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  bot_id UUID REFERENCES bots(id),
  period TEXT,    -- "2026-06"
  message_count INT DEFAULT 0,
  UNIQUE (user_id, bot_id, period)  -- ADDED: upsert target
);

-- ════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════

-- helper: is the current auth user an admin?
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users: each user sees/updates only their own row; admin sees all.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_row" ON users;
CREATE POLICY "user_own_row" ON users
  FOR ALL USING (id = auth.uid() OR is_admin());

-- Tenants can ONLY see their own data
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_own_bots" ON bots;
CREATE POLICY "tenant_own_bots" ON bots
  FOR ALL USING (user_id = auth.uid() OR is_admin());

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_own_conversations" ON conversations;
CREATE POLICY "tenant_own_conversations" ON conversations
  FOR ALL USING (
    bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid())
    OR is_admin()
  );

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_own_messages" ON messages;
CREATE POLICY "tenant_own_messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN bots b ON c.bot_id = b.id
      WHERE b.user_id = auth.uid()
    )
    OR is_admin()
  );

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_own_usage" ON usage_logs;
CREATE POLICY "tenant_own_usage" ON usage_logs
  FOR ALL USING (user_id = auth.uid() OR is_admin());

-- ════════════════════════════════════════════════════════════
-- Auto-provision a users row when an auth user is created.
-- ════════════════════════════════════════════════════════════
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

-- Atomic counters (used by the WhatsApp message pipeline).
CREATE OR REPLACE FUNCTION decrement_pack_balance(uid UUID) RETURNS void AS $$
  UPDATE users SET pack_balance = GREATEST(0, pack_balance - 1) WHERE id = uid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_usage(uid UUID, bid UUID, p TEXT) RETURNS void AS $$
  INSERT INTO usage_logs (user_id, bot_id, period, message_count)
  VALUES (uid, bid, p, 1)
  ON CONFLICT (user_id, bot_id, period)
  DO UPDATE SET message_count = usage_logs.message_count + 1;
$$ LANGUAGE sql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at maintenance for bots
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS bots_touch ON bots;
CREATE TRIGGER bots_touch BEFORE UPDATE ON bots
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
