import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { parseBody, connectSchema } from "@/lib/schemas";
import { sendOtp, checkOtp } from "@/lib/wa-verify-service";
import { e164ToLocalIL } from "@/lib/validation";
import { isDemoMode } from "@/lib/env";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/bots/[id]/connect
// body: { number, code? }  — no code → send OTP; with code → verify + save number
// Shares lib/wa-verify-service with the onboarding verify route; this route adds
// bot ownership, cross-tenant uniqueness and persistence.
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
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
    const r = await sendOtp(session.authId, number, "bot-connect");
    if (!r.ok) {
      return NextResponse.json(
        { error: r.error, configIssue: r.configIssue, retryInSec: r.retryInSec },
        { status: r.status ?? 400 },
      );
    }
    return NextResponse.json({ sent: true, demo: r.demo });
  }

  // Step 2: verify code
  const r = await checkOtp(session.authId, number, code);
  if (!r.ok) {
    return NextResponse.json({ error: r.error, configIssue: r.configIssue }, { status: r.status ?? 400 });
  }
  const e164 = r.number!;

  // Guard against the same number being claimed by two tenants. Compare BOTH
  // the E.164 and legacy 0-prefixed forms until migration 0010 normalizes rows.
  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("bots")
    .select("id")
    .in("whatsapp_number", [e164, e164ToLocalIL(e164)])
    .neq("id", params.id)
    .maybeSingle();
  if (taken) return jsonError("מספר זה כבר מחובר לבוט אחר במערכת");

  // active:true set server-side (was client-only — asymmetry vs connect-meta).
  const { data, error } = await supabase
    .from("bots")
    .update({ whatsapp_number: e164, active: true })
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
