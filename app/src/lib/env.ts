// Shared environment helpers.
//
// "Demo mode" = the app is running without a real Supabase project (placeholder
// or missing URL). In demo mode the app degrades gracefully so it still renders
// and external calls no-op. In any real (non-demo) deployment, security-critical
// secrets are REQUIRED — the fail-closed guards below enforce that.

/** True when no real Supabase project is configured (local/demo rendering). */
export function isDemoMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return !url || url.includes("placeholder");
}

/**
 * Returns the value of a required server secret, or throws in a real deployment
 * when it is missing. In demo mode it returns the provided fallback so local dev
 * keeps working. Use for secrets whose absence is a security hole (signing keys,
 * encryption keys), NOT for optional integrations.
 */
export function requiredSecret(name: string, value: string | undefined, demoFallback: string): string {
  if (value) return value;
  if (isDemoMode()) return demoFallback;
  throw new Error(`Missing required environment variable: ${name}`);
}
