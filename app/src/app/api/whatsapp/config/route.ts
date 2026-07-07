import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";
import { metaPublicConfig } from "@/lib/whatsapp/embedded-signup";
import { hasTwilioCreds, hasVerifyCreds } from "@/lib/twilio";

// GET /api/whatsapp/config — public (non-secret) config the browser needs to
// launch Meta Embedded Signup. appId + configId are not secrets; the app
// secret never leaves the server.
// manualEnabled: whether the manual OTP connect flow can work end-to-end.
// No Twilio at all = demo mode (the connect route pretends) → still "enabled";
// only a half-config (creds without a Verify service) disables it.
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  const manualEnabled = !hasTwilioCreds() || hasVerifyCreds();
  return NextResponse.json({ ...metaPublicConfig(), manualEnabled });
}
