import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider, hasPayment } from "@/lib/payments";
import { jsonError, unauthorized } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/billing/cancel
// Cancels at period end — the bot stays active until the period ends.
//
// Writes go through the service-role client: authorization is already
// enforced above by getSessionUser() + the .eq("id", session.authId) scope,
// and subscription_status/cancel_at_period_end must never be writable by the
// tenant's own RLS-scoped session (self-escalation risk).
export async function POST() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`billing:${session.authId}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  const supabase = createAdminClient();
  const subId =
    session.profile?.payment_subscription_id ?? session.profile?.stripe_subscription_id;

  if (hasPayment() && subId) {
    try {
      await getPaymentProvider().cancelSubscription(subId);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "ביטול נכשל", 502);
    }
  }

  // Keep service until the paid period actually ends (the daily cron revokes
  // once subscription_ends_at passes). If we don't know the period end (legacy /
  // trial), cancel immediately — the safe fallback.
  if (session.profile?.subscription_ends_at) {
    await supabase
      .from("users")
      .update({ cancel_at_period_end: true })
      .eq("id", session.authId);
    return NextResponse.json({
      ok: true,
      message: "המנוי יבוטל בתום תקופת החיוב הנוכחית. הבוט יישאר פעיל עד אז.",
    });
  }

  await supabase
    .from("users")
    .update({ subscription_status: "cancelled" })
    .eq("id", session.authId);
  return NextResponse.json({ ok: true, message: "המנוי בוטל." });
}
