import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import {
  hasTwilioCreds,
  hasVerifyCreds,
  startVerification,
  checkVerification,
} from "@/lib/twilio";
import { isValidPhoneIL } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, connectSchema } from "@/lib/schemas";
import { signWaVerifyToken } from "@/lib/wa-verify-token";

// POST /api/whatsapp/verify — bot-agnostic phone-ownership verification.
// body {number}        → send an SMS OTP via Twilio Verify
// body {number, code}  → check the code; success returns a short-lived signed
//                        token bound to {user, number}, consumed by POST
//                        /api/bots (onboarding step 5 creates the bot already
//                        connected — no draft bot needed before verifying).
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(connectSchema, raw);
  if (!parsed.ok) return jsonError(parsed.message);
  const { number, code } = parsed.data;
  if (!isValidPhoneIL(number)) return jsonError("מספר הטלפון אינו תקין");

  // Per-user AND per-number limits — the no-code branch sends a paid SMS,
  // and the per-number key blocks SMS-bombing a victim across accounts.
  if (
    !rateLimit(`wa-verify:${session.authId}`, 5, 60_000).allowed ||
    !rateLimit(`wa-verify-num:${number}`, 5, 600_000).allowed
  ) {
    return jsonError("יותר מדי ניסיונות. נסה שוב בעוד דקה.", 429);
  }

  // Half-configured Twilio (creds without a Verify service) — friendly 503,
  // never a raw env-var error.
  if (hasTwilioCreds() && !hasVerifyCreds()) {
    return jsonError(
      "חיבור וואטסאפ ידני עדיין לא זמין במערכת. נסה שוב בקרוב או פנה לתמיכה.",
      503,
    );
  }

  // Step 1: send the OTP
  if (!code) {
    if (!hasTwilioCreds()) {
      // Dev/demo without Twilio — pretend the code was sent.
      return NextResponse.json({ sent: true, demo: true });
    }
    try {
      await startVerification(number);
      return NextResponse.json({ sent: true });
    } catch (e) {
      console.error("[wa-verify] startVerification failed:", e instanceof Error ? e.message : e);
      return jsonError("שליחת הקוד נכשלה. נסה שוב בעוד רגע.", 502);
    }
  }

  // Step 2: check the OTP
  if (hasTwilioCreds()) {
    try {
      const res = await checkVerification(number, code);
      if (res.status !== "approved") return jsonError("הקוד שגוי או פג תוקף");
    } catch (e) {
      console.error("[wa-verify] checkVerification failed:", e instanceof Error ? e.message : e);
      return jsonError("אימות הקוד נכשל. נסה שוב.", 502);
    }
  }
  // (no Twilio: dev/demo — any code passes; the token is still user+number bound)

  return NextResponse.json({
    ok: true,
    number,
    token: signWaVerifyToken(session.authId, number),
  });
}
