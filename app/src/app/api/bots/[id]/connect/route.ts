import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { hasTwilioCreds, startVerification, checkVerification } from "@/lib/twilio";
import { isValidPhoneIL } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
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

  let body: { number?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const { number, code } = body;
  if (!number) return jsonError("חסר מספר טלפון");
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
      return jsonError(e instanceof Error ? e.message : "שליחת הקוד נכשלה", 502);
    }
  }

  // Step 2: verify code, then attach number to bot
  if (hasTwilioCreds()) {
    try {
      const res = await checkVerification(number, code);
      if (res.status !== "approved") return jsonError("הקוד שגוי או פג תוקף");
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "אימות הקוד נכשל", 502);
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
