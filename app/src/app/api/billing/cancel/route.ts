import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider, hasPayment } from "@/lib/payments";
import { jsonError, unauthorized } from "@/lib/errors";

// POST /api/billing/cancel
// Cancels at period end — the bot stays active until the period ends.
export async function POST() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  const subId =
    session.profile?.payment_subscription_id ?? session.profile?.stripe_subscription_id;

  if (hasPayment() && subId) {
    try {
      await getPaymentProvider().cancelSubscription(subId);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "ביטול נכשל", 502);
    }
  }

  await supabase
    .from("users")
    .update({ subscription_status: "cancelled" })
    .eq("id", session.authId);

  return NextResponse.json({
    ok: true,
    message: "המנוי יבוטל בתום תקופת החיוב הנוכחית. הבוט יישאר פעיל עד אז.",
  });
}
