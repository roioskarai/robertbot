// Short-lived proof that the CURRENT user verified ownership of a phone
// number via SMS OTP (Twilio Verify), decoupled from any bot row. Consumed by
// POST /api/bots so onboarding step 5 can create a bot already-connected —
// without creating a draft bot first (an abandoned draft would consume a
// basic-plan user's only bot slot).
//
// Domain-separated signing key: sha256("wa-verify|" + ADMIN_SESSION_SECRET).
// The admin 2FA cookie signs with sha256(ADMIN_SESSION_SECRET) directly, so
// the derived keys differ — neither token can ever verify as the other.

import { createHmac, timingSafeEqual, createHash } from "crypto";
import { requiredSecret } from "./env";

const TTL_MS = 15 * 60 * 1000; // 15 minutes — verify → finish is one sitting

function secret(): Buffer {
  const s = requiredSecret(
    "ADMIN_SESSION_SECRET",
    process.env.ADMIN_SESSION_SECRET,
    "dev-admin-secret",
  );
  return createHash("sha256").update("wa-verify|" + s).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Issue a token binding {user, phone number} for TTL_MS. */
export function signWaVerifyToken(sub: string, num: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ sub, num, exp: Date.now() + TTL_MS })));
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

/** True only for an untampered, unexpired token bound to this user+number. */
export function verifyWaVerifyToken(
  token: string | undefined,
  sub: string,
  num: string,
): boolean {
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = b64url(createHmac("sha256", secret()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    );
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return false;
    return parsed.sub === sub && parsed.num === num;
  } catch {
    return false;
  }
}
