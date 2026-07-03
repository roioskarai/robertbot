import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider, hasPayment } from "@/lib/payments";
import { jsonError, unauthorized } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/billing/pause
export async function POST() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`billing:${session.authId}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  const supabase = await createClient();
  const subId =
    session.profile?.payment_subscription_id ?? session.profile?.stripe_subscription_id;

  if (hasPayment() && subId) {
    try {
      await getPaymentProvider().pauseSubscription(subId);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "השהיה נכשלה", 502);
    }
  }

  // Grow cancels the recurring charge (no native pause) → mark as cancelled.
  // Stripe supports real pause → mark as paused.
  const provider = getPaymentProvider();
  const newStatus = provider.id === "grow" ? "cancelled" : "paused";
  await supabase
    .from("users")
    .update({ subscription_status: newStatus })
    .eq("id", session.authId);

  const msg = provider.id === "grow"
    ? "המנוי בוטל. כדי להמשיך — פתח מנוי חדש."
    : "המנוי הושהה.";
  return NextResponse.json({ ok: true, message: msg });
}
