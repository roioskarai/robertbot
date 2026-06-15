import { NextResponse } from "next/server";
import { stripeProvider } from "@/lib/payments/stripe-provider";
import { applyPaymentEvent, getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Stripe webhook — verifies the signature (raw body) and applies the
// normalized event. Kept available behind the payment abstraction.
export async function POST(req: Request) {
  // Only accept Stripe callbacks when Stripe is the active provider — avoids a
  // second live billing path when the deployment runs on Grow.
  if (getPaymentProvider().id !== "stripe") {
    return NextResponse.json({ error: "Stripe is not the active provider" }, { status: 503 });
  }
  if (!stripeProvider.isConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  try {
    const event = await stripeProvider.parseWebhook(req);
    await applyPaymentEvent(event);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "webhook failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ received: true });
}
