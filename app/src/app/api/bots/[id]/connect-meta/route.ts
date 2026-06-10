import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { encryptSecret } from "@/lib/crypto";
import { hasMetaCreds } from "@/lib/whatsapp/meta";
import {
  exchangeCodeForToken,
  subscribeAppToWaba,
  fetchWabaPhone,
} from "@/lib/whatsapp/embedded-signup";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/connect-meta
// Completes Meta Embedded Signup: { code, wabaId, phoneNumberId?, businessId?, displayNumber? }
// Each tenant connects its OWN WABA — the access token is stored encrypted and
// scoped to this bot only, so tenants stay fully isolated.
export async function POST(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!hasMetaCreds()) return jsonError("חיבור Meta אינו מוגדר עדיין", 503);

  let body: {
    code?: string;
    wabaId?: string;
    phoneNumberId?: string;
    businessId?: string;
    displayNumber?: string;
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  if (!body.code || !body.wabaId) return jsonError("חסרים פרטי חיבור (code/wabaId)");

  const supabase = createClient();
  // RLS guarantees the user can only update a bot they own.
  const { data: ownBot } = await supabase
    .from("bots")
    .select("id, meta_waba_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!ownBot) return jsonError("הבוט לא נמצא", 404);

  // Guard against silently overwriting an active Meta connection.
  if (ownBot.meta_waba_id && !body.force) {
    return jsonError("הבוט כבר מחובר לוואטסאפ. נתק קודם או שלח force:true לחיבור מחדש.", 409);
  }

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
      .select("id, whatsapp_number, active, wa_provider")
      .single();
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ ok: true, bot: data });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "חיבור הוואטסאפ נכשל", 502);
  }
}
