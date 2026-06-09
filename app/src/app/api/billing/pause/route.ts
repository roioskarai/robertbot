import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider, hasPayment } from "@/lib/payments";
import { jsonError, unauthorized } from "@/lib/errors";

// POST /api/billing/pause
export async function POST() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  const subId =
    session.profile?.payment_subscription_id ?? session.profile?.stripe_subscription_id;

  if (hasPayment() && subId) {
    try {
      await getPaymentProvider().pauseSubscription(subId);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "השהיה נכשלה", 502);
    }
  }

  await supabase
    .from("users")
    .update({ subscription_status: "paused" })
    .eq("id", session.authId);

  return NextResponse.json({ ok: true, message: "המנוי הושהה." });
}
