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

/** End of the paid period from now, by billing cycle. */
function periodEnd(cycle?: string | null): string {
  const d = new Date();
  if (cycle === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/**
 * Records a provider event id once. Returns true if this is the first time the
 * event is seen (safe to process), false if it was already processed (skip).
 * No-ops to `true` when the event carries no id.
 */
async function claimEvent(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string | null | undefined,
  eventType: string,
  userId?: string | null,
): Promise<boolean> {
  if (!eventId) return true;
  const { error } = await supabase
    .from("payment_events")
    .insert({ event_id: eventId, event_type: eventType, user_id: userId ?? null });
  if (!error) return true;
  // 23505 = unique_violation → this event was already processed → skip.
  if (error.code === "23505") return false;
  // Any other error (e.g. the ledger table isn't migrated yet) must NOT drop a
  // real payment — log and process it.
  console.error("[payments] payment_events insert error (processing anyway):", error.message);
  return true;
}

export async function applyPaymentEvent(ev: PaymentEvent): Promise<void> {
  if (ev.type === "ignore") return;
  const supabase = createAdminClient();

  switch (ev.type) {
    case "subscription_active": {
      if (!(await claimEvent(supabase, ev.eventId, ev.type, ev.userId))) return;
      await supabase
        .from("users")
        .update({
          plan: ev.plan ?? undefined,
          billing_cycle: ev.cycle ?? undefined,
          subscription_status: "active",
          cancel_at_period_end: false,
          subscription_ends_at: periodEnd(ev.cycle),
          payment_subscription_id: ev.subscriptionId ?? undefined,
          payment_customer_id: ev.customerId ?? undefined,
        })
        .eq("id", ev.userId);
      break;
    }

    case "pack_purchased": {
      if (!(await claimEvent(supabase, ev.eventId, ev.type, ev.userId))) return;
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
      if (!(await claimEvent(supabase, ev.eventId, ev.type, userId))) return;
      // The subscription has actually ended (period over) → revoke service now.
      await supabase
        .from("users")
        .update({ subscription_status: "cancelled", cancel_at_period_end: false })
        .eq("id", userId);
      // Subscription ended → deactivate the user's bots.
      await supabase.from("bots").update({ active: false }).eq("user_id", userId);
      break;
    }

    case "subscription_paused": {
      const userId = ev.userId ?? (await userIdForSubscription(supabase, ev.subscriptionId));
      if (!userId) break;
      if (!(await claimEvent(supabase, ev.eventId, ev.type, userId))) return;
      await supabase
        .from("users")
        .update({ subscription_status: "paused" })
        .eq("id", userId);
      break;
    }
  }
}
