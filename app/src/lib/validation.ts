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

// Reasonable upper bounds to stop oversized text reaching the DB / the model.
export const LIMITS = {
  name: 120,
  description: 2000,
  address: 200,
  faqField: 1000,
  serviceName: 120,
  password: 200,
} as const;
