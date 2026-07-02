import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider, hasPayment } from "@/lib/payments";
import { jsonError, unauthorized } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// GET /api/billing/portal — self-service management portal URL.
// Only providers that offer one (Stripe) return a URL; otherwise the app
// renders its own billing screen (Grow).
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`billing:${session.authId}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }
  if (!hasPayment()) return jsonError("סליקה אינה זמינה כרגע", 503);

  const provider = getPaymentProvider();
  if (!provider.hasPortal() || !provider.getPortalUrl) {
    return jsonError("ניהול המנוי מתבצע ישירות במערכת", 400);
  }

  const customerId = session.profile?.payment_customer_id ?? session.profile?.stripe_customer_id;
  if (!customerId) return jsonError("אין לקוח סליקה מקושר", 400);

  try {
    const url = await provider.getPortalUrl(customerId, `${APP_URL}/dashboard`);
    return NextResponse.json({ url });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "פתיחת הפורטל נכשלה", 502);
  }
}
