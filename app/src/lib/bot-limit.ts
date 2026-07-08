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
