import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe, hasStripeKey } from "@/lib/stripe";
import { jsonError, unauthorized } from "@/lib/errors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// GET /api/billing/portal — Stripe customer portal URL
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!hasStripeKey()) return jsonError("סליקה אינה זמינה כרגע", 503);
  if (!session.profile?.stripe_customer_id)
    return jsonError("אין לקוח Stripe מקושר", 400);

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: session.profile.stripe_customer_id,
    return_url: `${APP_URL}/dashboard`,
  });
  return NextResponse.json({ url: portal.url });
}
