-- 0008 — race-proof backstop for Meta WhatsApp connections:
-- no two bots may claim the same Meta phone-number id.
-- (The connect-meta route already checks this in code; the index makes it
-- atomic under concurrency — error 23505 is handled there.)
-- Requires owner approval: APPROVED - DATABASE.

CREATE UNIQUE INDEX IF NOT EXISTS bots_meta_phone_unique
  ON bots (meta_phone_number_id)
  WHERE meta_phone_number_id IS NOT NULL;
