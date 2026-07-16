import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAdminAudit, diffOf } from "@/lib/admin-audit";
import { decryptSecret } from "@/lib/crypto";
import { unsubscribeAppFromWaba } from "@/lib/whatsapp/embedded-signup";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/bots/[id]/reset-whatsapp — admin-initiated remote disconnect.
// Mirrors the customer-facing disconnect route, but is auditable against the
// bot's owner (target_type: "user") so it surfaces in the user's timeline.
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  if (!rateLimit(`admin-mutate:${clientKey(req)}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי פעולות. נסה שוב בעוד דקה.", 429);
  }

  const db = createAdminClient();
  const { data: bot } = await db
    .from("bots")
    .select("id, user_id, name, bot_name, whatsapp_number, active, wa_provider, meta_waba_id, wa_access_token")
    .eq("id", params.id)
    .maybeSingle();
  if (!bot) return jsonError("הבוט לא נמצא", 404);

  // Best-effort: release the WABA back to the tenant's plain WhatsApp.
  if (bot.wa_provider === "meta" && bot.meta_waba_id && bot.wa_access_token) {
    try {
      const token = decryptSecret(bot.wa_access_token);
      await unsubscribeAppFromWaba(bot.meta_waba_id, token);
    } catch {
      /* don't block reset on Meta API errors or missing enc key */
    }
  }

  const { data, error } = await db
    .from("bots")
    .update({
      whatsapp_number: null,
      active: false,
      wa_provider: null,
      meta_business_id: null,
      meta_waba_id: null,
      meta_phone_number_id: null,
      wa_access_token: null,
    })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);

  // Best-effort status update, decoupled from the critical write above.
  try {
    await db
      .from("bots")
      .update({ wa_connection_status: "disconnected", wa_last_error: null, wa_connected_at: null })
      .eq("id", params.id);
  } catch {
    /* status tracking only */
  }

  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: "bot.whatsapp_reset",
    target_type: "user",
    target_id: bot.user_id,
    target_label: bot.bot_name || bot.name || bot.id,
    diff: diffOf(
      { whatsapp_number: bot.whatsapp_number, active: bot.active },
      { whatsapp_number: null, active: false },
      ["whatsapp_number", "active"],
    ),
    meta: { bot_id: bot.id, ip: clientKey(req) },
  });

  return NextResponse.json({ ok: true, bot: data });
}
