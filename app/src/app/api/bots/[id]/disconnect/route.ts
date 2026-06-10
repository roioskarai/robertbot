import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { decryptSecret } from "@/lib/crypto";
import { unsubscribeAppFromWaba } from "@/lib/whatsapp/embedded-signup";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/disconnect — detach WhatsApp, deactivate the bot, and
// return the customer to their normal WhatsApp. For Meta-connected bots we also
// unsubscribe our app from the tenant's WABA (best-effort) and wipe the token.
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();

  // Load current connection (RLS scopes this to the owner).
  const { data: bot } = await supabase
    .from("bots")
    .select("wa_provider, meta_waba_id, wa_access_token")
    .eq("id", params.id)
    .maybeSingle();

  // Best-effort: release the WABA back to the tenant's plain WhatsApp.
  if (bot?.wa_provider === "meta" && bot.meta_waba_id && bot.wa_access_token) {
    try {
      await unsubscribeAppFromWaba(bot.meta_waba_id, decryptSecret(bot.wa_access_token));
    } catch {
      /* don't block disconnect on Meta API errors */
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
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, bot: data });
}
