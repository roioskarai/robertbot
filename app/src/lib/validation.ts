// Small, dependency-free input validators shared by API routes and forms.
// Hebrew-first product, Israeli phone numbers.

/** Basic but real email shape check: local@domain.tld (rejects "a@b"). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || "").trim());
}

/** Normalize a phone to digits, mapping +972 / 972 prefixes to a leading 0. */
export function normalizePhone(input: string): string {
  let p = (input || "").replace(/[^\d+]/g, "");
  p = p.replace(/^\+?972/, "0").replace(/^\+/, "");
  return p;
}

/** Israeli mobile/landline: 9–10 digits starting with 0 (after normalization). */
export function isValidPhoneIL(input: string): boolean {
  return /^0\d{8,9}$/.test(normalizePhone(input));
}

/**
 * Canonical E.164 form (+972…) for a valid Israeli number, or null if invalid.
 * This is the ONE storage/compare form for WhatsApp numbers — it matches what
 * Twilio actually dials, so "0501234567" and "+972501234567" collapse to the
 * same value and can never be mistaken for two different numbers.
 */
export function normalizePhoneE164(input: string): string | null {
  if (!isValidPhoneIL(input)) return null;
  const local = normalizePhone(input); // 0XXXXXXXXX
  return "+972" + local.slice(1);
}

/** Inverse of normalizePhoneE164 for the local (0…) form. Used for the
 *  dual-form uniqueness check while legacy rows are still 0-prefixed. */
export function e164ToLocalIL(e164: string): string {
  return "0" + e164.replace(/^\+972/, "");
}

// Reasonable upper bounds to stop oversized text reaching the DB / the model.
export const LIMITS = {
  name: 120,
  description: 2000,
  address: 200,
  faqField: 1000,
  serviceName: 120,
  password: 200,
} as const;

/**
 * Max accepted webhook payload in bytes (DoS guard). Real WhatsApp/Stripe/Grow
 * events are a few KB — 1MB leaves generous headroom.
 */
export const MAX_WEBHOOK_BYTES = 1_000_000;

/** True when the declared Content-Length exceeds the webhook size cap. */
export function declaredBodyTooLarge(req: Request): boolean {
  return Number(req.headers.get("content-length") || 0) > MAX_WEBHOOK_BYTES;
}
