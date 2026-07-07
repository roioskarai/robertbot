import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { hasTwilioCreds, hasVerifyCreds, startVerification, checkVerification } from "@/lib/twilio";
import { isValidPhoneIL } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, connectSchema } from "@/lib/schemas";
import { isDemoMode } from "@/lib/env";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/bots/[id]/connect
// body: { number, code? }  — no code → send OTP; with code → verify + save number
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await getSessionUser();
  if (!session) return unauthorized();

  // Tight limit — the no-code branch sends a paid Twilio verification message.
  if (!rateLimit(`bot-connect:${session.authId}`, 5, 60_000).allowed) {
    return jsonError("יותר מדי ניסיונות חיבור. נסה שוב בעוד דקה.", 429);
  }

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

  const supabase = await createClient();

  // Verify the bot belongs to the caller before doing any Twilio work
  // (defense-in-depth on top of RLS). Skipped in demo mode — no real DB.
  if (!isDemoMode()) {
    const { data: ownBot } = await supabase
      .from("bots")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", session.authId)
      .maybeSingle();
    if (!ownBot) return jsonError("הבוט לא נמצא", 404);
  }

  // Half-configured Twilio (creds without a Verify service) would throw a raw
  // env-var error from startVerification — return a friendly, non-leaky 503.
  const verifyMisconfigured = hasTwilioCreds() && !hasVerifyCreds();
  if (verifyMisconfigured) {
    return jsonError(
      "חיבור וואטסאפ ידני עדיין לא זמין במערכת. נסה שוב בקרוב או פנה לתמיכה.",
      503,
    );
  }

  // Step 1: send verification code
  if (!code) {
    if (!hasTwilioCreds()) {
      // Demo mode — no Twilio configured. Pretend the code was sent.
      return NextResponse.json({ sent: true, demo: true });
    }
    try {
      await startVerification(number);
      return NextResponse.json({ sent: true });
    } catch (e) {
      // Never surface internal error strings (env names, Twilio SDK text).
      console.error("[connect] startVerification failed:", e instanceof Error ? e.message : e);
      return jsonError("שליחת הקוד נכשלה. נסה שוב בעוד רגע.", 502);
    }
  }

  // Step 2: verify code, then attach number to bot
  if (hasTwilioCreds()) {
    try {
      const res = await checkVerification(number, code);
      if (res.status !== "approved") return jsonError("הקוד שגוי או פג תוקף");
    } catch (e) {
      console.error("[connect] checkVerification failed:", e instanceof Error ? e.message : e);
      return jsonError("אימות הקוד נכשל. נסה שוב.", 502);
    }
  }
  // (demo mode: accept any code)

  // Guard against the same WhatsApp number being claimed by two different tenants.
  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("bots")
    .select("id")
    .eq("whatsapp_number", number)
    .neq("id", params.id)
    .maybeSingle();
  if (taken) return jsonError("מספר זה כבר מחובר לבוט אחר במערכת");

  const { data, error } = await supabase
    .from("bots")
    .update({ whatsapp_number: number })
    .eq("id", params.id)
    .eq("user_id", session.authId)
    .select("*")
    .single();
  if (error) {
    // 23505 = the DB unique index rejected a number already taken (race-proof).
    if (error.code === "23505") {
      return jsonError("מספר זה כבר מחובר לבוט אחר במערכת", 409);
    }
    console.error("[connect] update failed:", error.message);
    return jsonError("חיבור המספר נכשל. נסה שוב.", 500);
  }

  return NextResponse.json({ ok: true, bot: data });
}
