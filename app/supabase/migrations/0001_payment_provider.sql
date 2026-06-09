-- ════════════════════════════════════════════════════════════
-- Migration 0001 — provider-agnostic billing (Grow / Stripe)
-- Run AFTER schema.sql on an existing project. Idempotent.
-- Decouples the app from Stripe so Grow (default) can be used.
-- ════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payment_provider TEXT
    CHECK (payment_provider IN ('grow', 'stripe')),
  ADD COLUMN IF NOT EXISTS payment_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_subscription_id TEXT;

-- Backfill: existing Stripe users keep working under the generic columns.
UPDATE users
  SET payment_provider = 'stripe',
      payment_customer_id = COALESCE(payment_customer_id, stripe_customer_id),
      payment_subscription_id = COALESCE(payment_subscription_id, stripe_subscription_id)
  WHERE stripe_customer_id IS NOT NULL
    AND payment_customer_id IS NULL;

CREATE INDEX IF NOT EXISTS users_payment_sub_idx ON users(payment_subscription_id);
