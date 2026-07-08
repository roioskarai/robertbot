import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/claude";
import { PLAN_LIMITS, resolvePlanId } from "@/lib/plans";
import { jsonError, unauthorized } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody, botCreateSchema } from "@/lib/schemas";
import { verifyWaVerifyToken } from "@/lib/wa-verify-token";
import { normalizePhoneE164, e164ToLocalIL } from "@/lib/validation";
import type { Bot } from "@/lib/types";

// GET /api/bots — list the current user's bots
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = await createClient();
  // user_id filter = defense-in-depth on top of RLS.
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("user_id", session.authId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[bots GET] db error:", error.message);
    return jsonError("טעינת הבוטים נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ bots: data ?? [] });
}

// POST /api/bots — create a new bot (enforces plan bot limit)
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`bot-create:${session.authId}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(botCreateSchema, raw);
  if (!parsed.ok) return jsonError(parsed.message);
  const body = parsed.data;

  const supabase = await createClient();

  // Enforce plan bot limit
  const plan = resolvePlanId(session.profile?.plan);
  const limit = PLAN_LIMITS[plan].bots;
  const { count } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.authId);
  if ((count ?? 0) >= limit) {
    return jsonError(
      `הגעת למגבלת הבוטים במסלול ${plan} (${limit}). שדרג כדי להוסיף עוד.`,
      403,
    );
  }

  // Optional verified WhatsApp number (onboarding step 5). Fail-closed: a
  // number without a valid, unexpired token bound to this user+number is
  // rejected — we never attach an unproven number at creation.
  let connectNumber: string | null = null;
  if (body.whatsapp_number) {
    // Store/verify on the canonical E.164 form — the same form the verify route
    // signed the ownership token over.
    const num = normalizePhoneE164(body.whatsapp_number);
    if (!num) return jsonError("מספר הטלפון אינו תקין");
    if (!verifyWaVerifyToken(body.wa_verify_token, session.authId, num)) {
      return jsonError(
        "אימות המספר פג תוקף — אמת שוב או דלג וחבר מאוחר יותר מה-Dashboard",
        403,
      );
    }
    // Cross-tenant uniqueness (same guard as the connect route) — compare both
    // E.164 and legacy 0-prefixed forms until migration 0010 normalizes rows.
    const admin = createAdminClient();
    const { data: taken } = await admin
      .from("bots")
      .select("id")
      .in("whatsapp_number", [num, e164ToLocalIL(num)])
      .maybeSingle();
    if (taken) return jsonError("מספר זה כבר מחובר לבוט אחר במערכת", 409);
    connectNumber = num;
  }

  const draft: Partial<Bot> = {
    user_id: session.authId,
    name: body.name,
    bot_name: body.bot_name || body.name,
    business_type: body.business_type ?? null,
    business_subtype: body.business_subtype ?? null,
    description: body.description ?? null,
    services: body.services ?? [],
    working_hours: body.working_hours ?? null,
    address: body.address ?? null,
    phone: body.phone ?? null,
    style: body.style ?? "friendly",
    faq: body.faq ?? [],
    active: false,
  };
  if (connectNumber) {
    // Verified at onboarding — the bot is born connected and live.
    draft.whatsapp_number = connectNumber;
    draft.active = true;
  }

  // Generate the system prompt from the config
  draft.system_prompt = buildSystemPrompt(draft as Bot);

  const { data, error } = await supabase
    .from("bots")
    .insert(draft)
    .select("*")
    .single();

  if (error) {
    // 23505 = unique index on whatsapp_number lost a race to another tenant.
    if (error.code === "23505") {
      return jsonError("מספר זה כבר מחובר לבוט אחר במערכת", 409);
    }
    console.error("[bots POST] db error:", error.message);
    return jsonError("יצירת הבוט נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ bot: data });
}
