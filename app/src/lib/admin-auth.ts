// Admin authentication & 2FA-session layer.
//
// Security model (defense in depth):
//   1. Supabase email/password session (first factor).
//   2. DB role must be 'admin'.
//   3. A signed, httpOnly 2FA cookie proving a valid TOTP was entered this
//      session (second factor). HMAC-SHA256, short TTL, bound to the user id.
//
// requireAdmin() demands all three. requireAdminPreTotp() demands 1+2 only
// (used by the enrollment / verify endpoints before the 2FA cookie exists).

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, createHash } from "crypto";
import { getSessionUser } from "./auth";
import { requiredSecret } from "./env";
import type { DBUser } from "./types";

// Optional bootstrap allowlist: grants admin to this email even before the DB
// role is set. Empty (unset) = role-only — fail-closed, no hardcoded default.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
export const ADMIN_COOKIE = "robert_admin_2fa";
const TTL_SECONDS = 8 * 60 * 60; // 8 hours

function secret(): Buffer {
  // Dedicated signing key. In a real deployment ADMIN_SESSION_SECRET is required;
  // we deliberately do NOT fall back to the service-role key (that would reuse a
  // super-secret as a session signer). Demo mode uses a dev placeholder.
  const s = requiredSecret("ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET, "dev-admin-secret");
  return createHash("sha256").update(s).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Issue a signed 2FA token for the given admin user id. */
export function signAdminToken(sub: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ sub, exp: Date.now() + TTL_SECONDS * 1000 })));
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Verify a signed 2FA token. Returns the subject id or null. */
export function verifyAdminToken(token: string | undefined): string | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = b64url(createHmac("sha256", secret()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

export interface AdminSession {
  authId: string;
  email: string;
  profile: DBUser;
}

/** Session + admin role, WITHOUT the 2FA requirement (for enrollment/verify). */
export async function requireAdminPreTotp(): Promise<AdminSession | null> {
  const session = await getSessionUser();
  if (!session?.profile) return null;
  const isAdmin =
    session.profile.role === "admin" || (!!ADMIN_EMAIL && session.email === ADMIN_EMAIL);
  if (!isAdmin) return null;
  return { authId: session.authId, email: session.email, profile: session.profile };
}

/** Full admin gate: session + admin role + valid 2FA cookie bound to this user. */
export async function requireAdmin(): Promise<AdminSession | null> {
  const pre = await requireAdminPreTotp();
  if (!pre) return null;
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const sub = verifyAdminToken(token);
  if (!sub || sub !== pre.authId) return null;
  return pre;
}
