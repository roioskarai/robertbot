import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { enforceActiveBotLimit } from "@/lib/bot-limit";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, connectMetaSchema } from "@/lib/schemas";
import { encryptSecret } from "@/lib/crypto";
import { hasMetaCreds } from "@/lib/whatsapp/meta";
import {
  exchangeCodeForToken,
  subscribeAppToWaba,
  fetchWabaPhone,
} from "@/lib/whatsapp/embedded-signup";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/bots/[id]/connect-meta
// Completes Meta Embedded Signup: { code, wabaId, phoneNumberId?, businessId?, displayNumber? }
// Each tenant connects its OWN WABA — the access token is stored encrypted and
// scoped to this bot only, so tenants stay fully isolated.
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!hasMetaCreds()) return jsonError("חיבור Meta אינו מוגדר עדיין", 503);

  if (!rateLimit(`bot-connect:${session.authId}`, 5, 60_000).allowed) {
    return jsonError("יותר מדי ניסיונות חיבור. נסה שוב בעוד דקה.", 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(connectMetaSchema, raw);
  if (!parsed.ok) return jsonError(parsed.message);
  const body = parsed.data;

  const supabase = await createClient();
  // Explicit user_id filter = defense-in-depth on top of RLS.
  const { data: ownBot } = await supabase
    .from("bots")
    .select("id, meta_waba_id")
    .eq("id", params.id)
    .eq("user_id", session.authId)
    .maybeSingle();
  if (!ownBot) return jsonError("הבוט לא נמצא", 404);

  // Guard against silently overwriting an active Meta connection.
  if (ownBot.meta_waba_id && !body.force) {
    return jsonError("הבוט כבר מחובר לוואטסאפ. נתק קודם או שלח force:true לחיבור מחדש.", 409);
  }

  // This route auto-activates the bot — enforce the same plan limit the
  // dedicated activate route uses, before doing any Meta work.
  const limitErr = await enforceActiveBotLimit(supabase, session.authId, params.id);
  if (limitErr) return limitErr;

  // Admin client to check cross-tenant ownership (RLS would hide other
  // tenants' rows). Only used for read-only "is this taken?" lookups.
  const admin = createAdminClient();

  try {
    const token = await exchangeCodeForToken(body.code);
    await subscribeAppToWaba(body.wabaId, token);

    let phoneNumberId = body.phoneNumberId ?? null;
    let displayNumber = body.displayNumber ?? null;
    if (!phoneNumberId) {
      const info = await fetchWabaPhone(body.wabaId, token);
      phoneNumberId = info?.phoneNumberId ?? null;
      displayNumber = displayNumber ?? info?.displayNumber ?? null;
    }
    if (!phoneNumberId) return jsonError("לא נמצא מספר טלפון ב-WABA", 502);

    // Reject a phone-number id already owned by another tenant's bot.
    const { data: pidTaken } = await admin
      .from("bots")
      .select("id")
      .eq("meta_phone_number_id", phoneNumberId)
      .neq("id", params.id)
      .maybeSingle();
    if (pidTaken) return jsonError("מספר זה כבר מחובר לבוט אחר במערכת", 409);

    // Reject a display number already owned by another tenant's bot.
    if (displayNumber) {
      const { data: numTaken } = await admin
        .from("bots")
        .select("id")
        .eq("whatsapp_number", displayNumber)
        .neq("id", params.id)
        .maybeSingle();
      if (numTaken) return jsonError("מספר זה כבר מחובר לבוט אחר במערכת", 409);
    }

    const { data, error } = await supabase
      .from("bots")
      .update({
        wa_provider: "meta",
        meta_business_id: body.businessId ?? null,
        meta_waba_id: body.wabaId,
        meta_phone_number_id: phoneNumberId,
        wa_access_token: encryptSecret(token), // encrypted at rest
        whatsapp_number: displayNumber,
        active: true,
      })
      .eq("id", params.id)
      .eq("user_id", session.authId)
      .select("id, whatsapp_number, active, wa_provider")
      .single();
    if (error) {
      // 23505 = a unique index rejected a number/phone-id already taken
      // (race-proof backstop for the cross-tenant checks above).
      if (error.code === "23505") {
        return jsonError("מספר זה כבר מחובר לבוט אחר במערכת", 409);
      }
      return jsonError(error.message, 500);
    }

    // Best-effort status update, decoupled from the critical write above.
    try {
      await supabase
        .from("bots")
        .update({ wa_connection_status: "connected", wa_connected_at: new Date().toISOString(), wa_last_error: null })
        .eq("id", params.id)
        .eq("user_id", session.authId);
    } catch {
      /* status tracking only */
    }

    return NextResponse.json({ ok: true, bot: data });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "חיבור הוואטסאפ נכשל", 502);
  }
}
