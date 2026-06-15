import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { hasTwilioCreds, startVerification, checkVerification } from "@/lib/twilio";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/connect
// body: { number, code? }  — no code → send OTP; with code → verify + save number
export async function POST(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let body: { number?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const { number, code } = body;
  if (!number) return jsonError("חסר מספר טלפון");

  const supabase = createClient();

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
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true, bot: data });
}
