import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe, hasStripeKey, planLineItem, packLineItem } from "@/lib/stripe";
import { parseProduct } from "@/lib/plans";
import { jsonError, unauthorized } from "@/lib/errors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST /api/billing/checkout  body: { product: "advanced_monthly" | "pack_regular" | ... }
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!hasStripeKey()) return jsonError("סליקה אינה זמינה כרגע (חסר STRIPE_SECRET_KEY)", 503);

  let body: { product?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = body.product ? parseProduct(body.product) : null;
  if (!parsed) return jsonError("מוצר לא חוקי");

  // Store access rule: packs are for active subscribers only.
  if (parsed.kind === "pack" && session.profile?.subscription_status !== "active") {
    return jsonError("רכישת Packs זמינה למנויים פעילים בלבד", 403);
  }

  const stripe = getStripe();
  const supabase = createClient();

  // Reuse / create the Stripe customer.
  let customerId = session.profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      metadata: { user_id: session.authId },
    });
    customerId = customer.id;
    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", session.authId);
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: parsed.kind === "plan" ? "subscription" : "payment",
    customer: customerId,
    line_items: [
      parsed.kind === "plan"
        ? planLineItem(parsed.plan, parsed.cycle)
        : packLineItem(parsed.pack),
    ],
    success_url: `${APP_URL}/dashboard?checkout=success`,
    cancel_url: `${APP_URL}/dashboard?checkout=cancel`,
    locale: "auto",
    metadata: {
      user_id: session.authId,
      product: body.product!,
      ...(parsed.kind === "plan"
        ? { plan: parsed.plan, cycle: parsed.cycle }
        : { pack: parsed.pack }),
    },
  });

  return NextResponse.json({ url: checkout.url });
}
