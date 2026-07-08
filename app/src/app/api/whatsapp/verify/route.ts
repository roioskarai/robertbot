import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { parseBody, connectSchema } from "@/lib/schemas";
import { sendOtp, checkOtp } from "@/lib/wa-verify-service";
import { signWaVerifyToken } from "@/lib/wa-verify-token";

// POST /api/whatsapp/verify — bot-agnostic phone-ownership verification.
// body {number}        → send an SMS OTP via Twilio Verify
// body {number, code}  → check the code; success returns a short-lived signed
//                        token bound to {user, E.164 number}, consumed by POST
//                        /api/bots (onboarding step 5 creates the bot already
//                        connected — no draft bot needed before verifying).
//
// All send/verify logic (normalization, rate limits, demo/env guards, Twilio
// error mapping + logging) lives in lib/wa-verify-service so this route and the
// dashboard's /connect route behave identically.
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

  // Step 1: send the OTP
  if (!code) {
    const r = await sendOtp(session.authId, number, "onboarding");
    if (!r.ok) {
      return NextResponse.json(
        { error: r.error, configIssue: r.configIssue, retryInSec: r.retryInSec },
        { status: r.status ?? 400 },
      );
    }
    return NextResponse.json({ sent: true, demo: r.demo });
  }

  // Step 2: check the OTP → issue the ownership token bound to the E.164 number
  const r = await checkOtp(session.authId, number, code);
  if (!r.ok) {
    return NextResponse.json({ error: r.error, configIssue: r.configIssue }, { status: r.status ?? 400 });
  }
  return NextResponse.json({
    ok: true,
    number: r.number,
    token: signWaVerifyToken(session.authId, r.number!),
  });
}
