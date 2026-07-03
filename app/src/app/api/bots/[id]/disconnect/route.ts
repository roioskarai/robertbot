import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { decryptSecret } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { unsubscribeAppFromWaba } from "@/lib/whatsapp/embedded-signup";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/bots/[id]/disconnect — detach WhatsApp, deactivate the bot, and
// return the customer to their normal WhatsApp. For Meta-connected bots we also
// unsubscribe our app from the tenant's WABA (best-effort) and wipe the token.
export async function POST(_req: Request, props: Ctx) {
  const params = await props.params;
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`bot-write:${session.authId}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  const supabase = await createClient();

  // Load current connection (user_id filter = defense-in-depth on top of RLS).
  const { data: bot } = await supabase
    .from("bots")
    .select("wa_provider, meta_waba_id, wa_access_token")
    .eq("id", params.id)
    .eq("user_id", session.authId)
    .maybeSingle();

  // Best-effort: release the WABA back to the tenant's plain WhatsApp.
  if (bot?.wa_provider === "meta" && bot.meta_waba_id && bot.wa_access_token) {
    try {
      const token = decryptSecret(bot.wa_access_token);
      await unsubscribeAppFromWaba(bot.meta_waba_id, token);
    } catch {
      /* don't block disconnect on Meta API errors or missing enc key */
    }
  }

  const { data, error } = await supabase
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
    .eq("user_id", session.authId)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, bot: data });
}
