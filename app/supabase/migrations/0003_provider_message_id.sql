-- Migration 0003 — rename twilio_message_sid → provider_message_id
-- Supports both Twilio SIDs and Meta wamids for idempotency. Idempotent.
ALTER TABLE messages
  RENAME COLUMN twilio_message_sid TO provider_message_id;
