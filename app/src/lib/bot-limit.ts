import type { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/errors";
import { PLAN_LIMITS, resolvePlanId } from "@/lib/plans";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Enforce the plan's active-bot limit before activating a bot.
// Pass a USER-CONTEXT client (RLS-scoped) so the count only sees the
// caller's own bots — this is what keeps the limit tenant-isolated.
// `excludeBotId` is the bot being (re)activated, so it is never double-counted.
//
// Returns a Hebrew 403 NextResponse when the limit is reached, or null when
// activation is allowed. All callers (activate / PUT / connect-meta) share this
// so the rule and the message stay identical across every activation path.
export async function enforceActiveBotLimit(
  supabase: ServerClient,
  authId: string,
  excludeBotId: string,
) {
  const { data: userRow } = await supabase
    .from("users")
    .select("plan")
    .eq("id", authId)
    .single();
  const plan = resolvePlanId(userRow?.plan);
  const limit = PLAN_LIMITS[plan].bots;
  const { count } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .neq("id", excludeBotId);
  if ((count ?? 0) >= limit) {
    return jsonError(`המסלול שלך מאפשר עד ${limit} בוטים פעילים בו-זמנית — שדרג כדי להוסיף יותר`, 403);
  }
  return null;
}

/** A bot counts as "connected" once it has a Twilio number OR a Meta phone id. */
export function botHasConnection(bot: {
  whatsapp_number?: string | null;
  meta_phone_number_id?: string | null;
}): boolean {
  return Boolean(bot.whatsapp_number || bot.meta_phone_number_id);
}

const NO_NUMBER_MSG =
  "אי אפשר להפעיל בוט ללא מספר וואטסאפ מחובר — חבר מספר קודם";

// A bot must never be active without a connected number: an "active" bot with no
// sender can't actually answer anyone, which is exactly the confusing state the
// dashboard used to allow. Callers that flip a bot on enforce this on the
// off→on transition. Fetches only the two connection columns (RLS-scoped).
export async function requireConnectedNumber(
  supabase: ServerClient,
  authId: string,
  botId: string,
) {
  const { data: bot } = await supabase
    .from("bots")
    .select("whatsapp_number, meta_phone_number_id")
    .eq("id", botId)
    .eq("user_id", authId)
    .maybeSingle();
  if (!bot || !botHasConnection(bot)) return jsonError(NO_NUMBER_MSG, 400);
  return null;
}
