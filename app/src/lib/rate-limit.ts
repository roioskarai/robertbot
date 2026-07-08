/**
 * Lightweight in-memory per-bot rate limiter. Good enough for a single
 * serverless instance / local dev. For multi-instance production, back
 * this with Upstash Redis or Supabase.
 */
const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 20; // messages per bot per minute

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(botId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const bucket = buckets.get(botId);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(botId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_PER_WINDOW - 1 };
  }

  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX_PER_WINDOW - bucket.count };
}

/**
 * Generic keyed rate limiter (per-key sliding window). Used to throttle auth
 * and admin endpoints. In-memory — see the caveat above for multi-instance.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  if (bucket.count >= max) return { allowed: false, remaining: 0 };
  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count };
}

/**
 * A one-shot cooldown: reports seconds left if `key` is still cooling down,
 * else 0. Distinct from rateLimit — it does NOT consume on read, so a failed
 * attempt never traps the user behind a cooldown they didn't earn. Call
 * armCooldown() only after a successful action.
 */
export function cooldownRemaining(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  const rem = Math.ceil((bucket.resetAt - Date.now()) / 1000);
  return rem > 0 ? rem : 0;
}

/** Arm a cooldown window for `key` (e.g. after a successful OTP send). */
export function armCooldown(key: string, windowMs: number): void {
  buckets.set(key, { count: 1, resetAt: Date.now() + windowMs });
}

/** Best-effort client identifier (IP) for rate-limit keys. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
