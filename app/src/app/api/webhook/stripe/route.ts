import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, hasStripeKey } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { packById, type PackId, type PlanId, type BillingCycle } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Stripe webhook — must read the RAW body to verify the signature.
export async function POST(req: Request) {
  if (!hasStripeKey() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (e) {
    return NextResponse.json(
      { error: `signature verification failed: ${e instanceof Error ? e.message : ""}` },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.user_id;
      if (!userId) break;

      if (s.mode === "subscription") {
        await supabase
          .from("users")
          .update({
            plan: (s.metadata?.plan as PlanId) ?? undefined,
            billing_cycle: (s.metadata?.cycle as BillingCycle) ?? undefined,
            subscription_status: "active",
            stripe_subscription_id:
              typeof s.subscription === "string" ? s.subscription : null,
          })
          .eq("id", userId);
      } else if (s.mode === "payment" && s.metadata?.pack) {
        // One-time message pack — add to never-expiring balance.
        const pack = packById(s.metadata.pack as PackId);
        const { data: u } = await supabase
          .from("users")
          .select("pack_balance")
          .eq("id", userId)
          .maybeSingle();
        const current = (u?.pack_balance as number) ?? 0;
        await supabase
          .from("users")
          .update({ pack_balance: current + pack.messages })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const status =
        sub.cancel_at_period_end || sub.status === "canceled"
          ? "cancelled"
          : sub.status === "paused"
            ? "paused"
            : "active";
      await supabase
        .from("users")
        .update({ subscription_status: status })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      // Subscription ended → deactivate the user's bots.
      const { data: u } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();
      await supabase
        .from("users")
        .update({ subscription_status: "cancelled" })
        .eq("stripe_subscription_id", sub.id);
      if (u?.id) {
        await supabase.from("bots").update({ active: false }).eq("user_id", u.id);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
