// The ONE place the manual WhatsApp OTP flow lives. Both routes that connect a
// number — POST /api/whatsapp/verify (onboarding) and POST /api/bots/[id]/connect
// (dashboard) — call sendOtp/checkOtp here, so validation, normalization, rate
// limits, the demo/env guards, Twilio error mapping and structured logging are
// identical and defined once (they used to be duplicated and drift).

import { hasTwilioCreds, hasVerifyCreds, startVerification, checkVerification } from "./twilio";
import { normalizePhoneE164 } from "./validation";
import { rateLimit, cooldownRemaining, armCooldown } from "./rate-limit";
import { mapTwilioError, maskPhone, type WaErrorKind } from "./twilio-errors";
import { createAdminClient } from "./supabase/admin";
import { isDemoMode } from "./env";

export type OtpScope = "onboarding" | "bot-connect";

const RESEND_COOLDOWN_MS = 45_000;

export interface OtpSendResult {
  ok: boolean;
  /** Normalized E.164 number (present on success and on most failures). */
  number?: string;
  demo?: boolean;
  status?: number; // HTTP status to return on failure
  error?: string; // Hebrew message on failure
  configIssue?: boolean; // true when the failure is on OUR side (misconfig)
  retryInSec?: number; // for cooldown / rate-limit failures
}

export interface OtpCheckResult {
  ok: boolean;
  number?: string;
  demo?: boolean;
  status?: number;
  error?: string;
  configIssue?: boolean;
}

// The friendly 503 for a half-configured Twilio (creds without a Verify service).
const NOT_READY = "חיבור וואטסאפ ידני עדיין לא זמין במערכת. נסה שוב בקרוב או פנה לתמיכה.";

async function logFailure(
  op: "send" | "check",
  scope: OtpScope | "check",
  userId: string,
  number: string,
  info: { twilioCode?: number; httpStatus: number; kind: WaErrorKind; moreInfo?: string; userMessageHe?: string },
) {
  console.error(
    "[wa-verify]",
    JSON.stringify({ op, kind: info.kind, twilioCode: info.twilioCode, httpStatus: info.httpStatus, userId, phone: maskPhone(number) }),
  );
  if (info.kind === "config") {
    // Owner runbook hint — the single most likely production root cause.
    console.error(
      "[wa-verify] CONFIG ISSUE — בדוק Twilio Console: Verify Service → SMS channel enabled; Messaging → Geo-Permissions → Israel enabled.",
    );
  }
  // Best-effort diagnostic capture for the admin /admin/insights screen. Never
  // let a logging failure (or a missing wa_connection_events table before
  // migration 0015) affect the connect flow — swallow everything.
  if (isDemoMode()) return;
  try {
    await createAdminClient()
      .from("wa_connection_events")
      .insert({
        user_id: userId,
        scope,
        twilio_code: info.twilioCode ?? null,
        kind: info.kind,
        phone_masked: maskPhone(number),
        message_he: info.userMessageHe ?? null,
      });
  } catch {
    /* diagnostics only */
  }
}

/** Send an SMS OTP to `rawNumber`. Returns a normalized number on success. */
export async function sendOtp(userId: string, rawNumber: string, scope: OtpScope): Promise<OtpSendResult> {
  const number = normalizePhoneE164(rawNumber);
  if (!number) return { ok: false, status: 400, error: "מספר הטלפון אינו תקין" };

  // Abuse guards: per-user (5/min) AND per-number (5/10min, anti SMS-bomb).
  if (
    !rateLimit(`wa-otp:${scope}:${userId}`, 5, 60_000).allowed ||
    !rateLimit(`wa-otp-num:${number}`, 5, 600_000).allowed
  ) {
    return { ok: false, number, status: 429, error: "יותר מדי ניסיונות. נסה שוב בעוד דקה." };
  }

  // Half-configured Twilio → friendly 503, flagged as a config issue.
  if (hasTwilioCreds() && !hasVerifyCreds()) {
    return { ok: false, number, status: 503, error: NOT_READY, configIssue: true };
  }

  // No Twilio at all → demo/dev: pretend it was sent (any code will pass later).
  if (!hasTwilioCreds()) return { ok: true, number, demo: true };

  // Don't let the user re-spam sends to the same number.
  const cdKey = `wa-otp-cd:${number}`;
  const rem = cooldownRemaining(cdKey);
  if (rem > 0) {
    return { ok: false, number, status: 429, error: `אפשר לשלוח קוד חדש בעוד ${rem} שניות`, retryInSec: rem };
  }

  try {
    await startVerification(number);
    armCooldown(cdKey, RESEND_COOLDOWN_MS);
    return { ok: true, number };
  } catch (e) {
    const m = mapTwilioError(e, "send");
    await logFailure("send", scope, userId, number, m);
    return { ok: false, number, status: m.httpStatus, error: m.userMessageHe, configIssue: m.kind === "config" };
  }
}

/** Verify `code` for `rawNumber`. Returns the normalized number on success. */
export async function checkOtp(userId: string, rawNumber: string, code: string): Promise<OtpCheckResult> {
  const number = normalizePhoneE164(rawNumber);
  if (!number) return { ok: false, status: 400, error: "מספר הטלפון אינו תקין" };

  // Light per-user guard against code brute-forcing at our layer (Twilio also
  // enforces its own max-check limit → surfaced via mapTwilioError 60202).
  if (!rateLimit(`wa-otp-check:${userId}`, 8, 60_000).allowed) {
    return { ok: false, number, status: 429, error: "יותר מדי ניסיונות אימות. נסה שוב בעוד דקה." };
  }

  if (hasTwilioCreds() && !hasVerifyCreds()) {
    return { ok: false, number, status: 503, error: NOT_READY, configIssue: true };
  }

  // No Twilio → demo/dev: accept any code (the caller still binds user+number).
  if (!hasTwilioCreds()) return { ok: true, number, demo: true };

  try {
    const res = await checkVerification(number, code);
    if (res.status !== "approved") return { ok: false, number, status: 400, error: "הקוד שגוי או פג תוקף" };
    return { ok: true, number };
  } catch (e) {
    const m = mapTwilioError(e, "check");
    await logFailure("check", "check", userId, number, m);
    return { ok: false, number, status: m.httpStatus, error: m.userMessageHe, configIssue: m.kind === "config" };
  }
}
