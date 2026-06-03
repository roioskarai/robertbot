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
