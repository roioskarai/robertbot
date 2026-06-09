// Applies a normalized PaymentEvent to the database. Shared by every
// provider's webhook route so the persistence logic lives in one place.

import { createAdminClient } from "@/lib/supabase/admin";
import { packById } from "@/lib/plans";
import type { PaymentEvent } from "./types";

/** Resolve the owning user id from a subscription id when the event lacks it. */
async function userIdForSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionId?: string | null,
): Promise<string | null> {
  if (!subscriptionId) return null;
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("payment_subscription_id", subscriptionId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function applyPaymentEvent(ev: PaymentEvent): Promise<void> {
  if (ev.type === "ignore") return;
  const supabase = createAdminClient();

  switch (ev.type) {
    case "subscription_active": {
      await supabase
        .from("users")
        .update({
          plan: ev.plan ?? undefined,
          billing_cycle: ev.cycle ?? undefined,
          subscription_status: "active",
          payment_subscription_id: ev.subscriptionId ?? undefined,
          payment_customer_id: ev.customerId ?? undefined,
        })
        .eq("id", ev.userId);
      break;
    }

    case "pack_purchased": {
      // One-time message pack — add to the never-expiring balance.
      const pack = packById(ev.pack);
      const { data: u } = await supabase
        .from("users")
        .select("pack_balance")
        .eq("id", ev.userId)
        .maybeSingle();
      const current = (u?.pack_balance as number) ?? 0;
      await supabase
        .from("users")
        .update({ pack_balance: current + pack.messages })
        .eq("id", ev.userId);
      break;
    }

    case "subscription_cancelled": {
      const userId = ev.userId ?? (await userIdForSubscription(supabase, ev.subscriptionId));
      if (!userId) break;
      await supabase
        .from("users")
        .update({ subscription_status: "cancelled" })
        .eq("id", userId);
      // Subscription ended → deactivate the user's bots.
      await supabase.from("bots").update({ active: false }).eq("user_id", userId);
      break;
    }

    case "subscription_paused": {
      const userId = ev.userId ?? (await userIdForSubscription(supabase, ev.subscriptionId));
      if (!userId) break;
      await supabase
        .from("users")
        .update({ subscription_status: "paused" })
        .eq("id", userId);
      break;
    }
  }
}
