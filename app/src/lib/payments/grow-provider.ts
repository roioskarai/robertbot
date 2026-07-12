// Grow (formerly Meshulam) implementation of the PaymentProvider interface.
// Uses Grow's "Light Server" API. Grow returns a hosted payment-page URL we
// redirect the customer to; recurring billing + Hebrew tax invoices are handled
// by Grow itself, and a server-to-server callback notifies us of each charge.
//
// ⚠️ Owner action: confirm GROW_USER_ID / GROW_PAGE_CODE / GROW_API_KEY from the
// Grow dashboard, and the exact field names below against Grow's current docs
// (https://grow-il.readme.io/). Everything is env-gated so demo mode stays safe.

import { createHmac, timingSafeEqual } from "crypto";
import { PRICING, packById } from "@/lib/plans";
import type { PackId, PlanId, BillingCycle } from "@/lib/plans";
import type {
  CheckoutInput,
  CheckoutOutput,
  PaymentEvent,
  PaymentProvider,
} from "./types";

const GROW_ENV = process.env.GROW_ENV === "production" ? "production" : "sandbox";
const BASE =
  GROW_ENV === "production"
    ? "https://secure.meshulam.co.il/api/light/server/1.0"
    : "https://sandbox.meshulam.co.il/api/light/server/1.0";

/**
 * Idempotency key for a Grow charge. Prefer a per-charge unique id
 * (transactionId/asmachta). recurringId is STABLE across monthly renewals —
 * using it alone would make every renewal share one key, so claimEvent would
 * skip renewals #2+ and the subscription would never extend (the cron then
 * revokes a paying customer). When only recurringId exists, scope it to the
 * current month so each billing period is a distinct key while same-period
 * retries still dedup. Pure + exported for tests.
 */
export function growIdempotencyKey(
  perChargeId: string,
  recurringId: string,
  now: Date = new Date(),
): string | null {
  if (perChargeId) return perChargeId;
  if (recurringId) return `${recurringId}:${now.toISOString().slice(0, 7)}`;
  return null;
}

function creds() {
  return {
    userId: process.env.GROW_USER_ID || "",
    pageCode: process.env.GROW_PAGE_CODE || "",
    apiKey: process.env.GROW_API_KEY || "",
  };
}

/** Generic form-encoded POST to a Grow Light endpoint. */
async function growRequest(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<Record<string, unknown>> {
  const { userId, pageCode, apiKey } = creds();
  const form = new URLSearchParams();
  form.set("pageCode", pageCode);
  form.set("userId", userId);
  form.set("apiKey", apiKey);
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));

  const res = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const json = (await res.json()) as Record<string, unknown>;
  // Grow returns { status: 1, data: {...} } on success, { status: 0, err: {...} }.
  if (json.status !== 1 && json.status !== "1") {
    const err = (json.err as { message?: string } | undefined)?.message;
    throw new Error(`Grow ${endpoint} failed: ${err ?? JSON.stringify(json)}`);
  }
  return (json.data as Record<string, unknown>) ?? {};
}

export const growProvider: PaymentProvider = {
  id: "grow",

  isConfigured() {
    const { userId, pageCode, apiKey } = creds();
    return Boolean(userId && pageCode && apiKey);
  },

  hasPortal() {
    // Grow has no Stripe-style customer portal — the app renders its own
    // billing screen and uses cancel/pause endpoints directly.
    return false;
  },

  async createCheckout(input: CheckoutInput): Promise<CheckoutOutput> {
    const isPlan = input.kind === "plan";
    const sum = isPlan
      ? input.cycle === "annual"
        ? PRICING[input.plan!].annual * 12
        : PRICING[input.plan!].monthly
      : packById(input.pack!).price;

    const description = isPlan
      ? `Robert — מסלול ${input.plan} (${input.cycle === "annual" ? "שנתי" : "חודשי"})`
      : `Robert — חבילת הודעות ${input.pack}`;

    const data = await growRequest("createPaymentProcess", {
      sum,
      description,
      pageField_fullName: "",
      // Recurring plans bill on a fixed interval; packs are one-off.
      // chargeType 1 = regular, 2 = recurring/standing order (confirm in dashboard).
      chargeType: isPlan ? 2 : 1,
      ...(isPlan
        ? { recurringType: input.cycle === "annual" ? "year" : "month" }
        : {}),
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      // Custom fields ride along and come back on the webhook → tenant mapping.
      // cField10 is intentionally omitted — the webhook is authenticated by
      // HMAC-SHA256 of the callback body, not a shared secret in the payload.
      cField1: input.userId,
      cField2: input.product,
    });

    const url = (data.url as string) || (data.paymentUrl as string);
    if (!url) throw new Error("Grow did not return a payment URL");
    return { url };
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    // Stop the recurring charge. Grow keys recurring by its own transaction id.
    await growRequest("cancelRecurringPayment", { recurringId: subscriptionId });
  },

  async pauseSubscription(subscriptionId: string): Promise<void> {
    // Grow has no native "pause" — cancels the recurring charge at the Grow level.
    // The billing/pause route must set subscription_status="cancelled" in the DB
    // (not "paused") so the UI shows the correct state and resume creates a new checkout.
    await growRequest("cancelRecurringPayment", { recurringId: subscriptionId });
  },

  async parseWebhook(req: Request): Promise<PaymentEvent> {
    // Grow posts a server-to-server callback (form-encoded or JSON).
    const raw = await req.text();
    let p: Record<string, string> = {};
    try {
      p = JSON.parse(raw);
    } catch {
      new URLSearchParams(raw).forEach((v, k) => {
        p[k] = v;
      });
    }
    // Grow may nest fields under "data".
    const f = (key: string): string =>
      p[key] ?? (p["data"] ? (JSON.parse(p["data"])[key] as string) : "") ?? "";

    // Timing-safe HMAC-SHA256 verification. GROW_WEBHOOK_SECRET is a server-only
    // key — never sent to the browser or embedded in the checkout payload.
    // Grow signs the raw callback body; if they don't, we fall back to rejecting
    // unsigned requests when the secret is configured.
    // Fail-closed: GROW_WEBHOOK_SECRET must be configured and the callback must be signed.
    // Without this, any attacker can POST a fake payment and get a free plan upgrade.
    const secret = process.env.GROW_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("Grow webhook: GROW_WEBHOOK_SECRET not configured — rejecting callback");
    }
    const sig = (p["signature"] ?? p["hmac"] ?? "") as string;
    if (!sig) {
      throw new Error("Grow webhook: missing signature");
    }
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig.replace(/^sha256=/, ""), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Grow webhook signature mismatch");
    }

    const userId = f("cField1");
    const product = f("cField2");
    if (!userId || !product) return { type: "ignore" };

    // Successful transaction status. Grow uses statusCode/transactionTypeId;
    // treat an approved charge as success (confirm exact codes in dashboard).
    // Only treat explicit success codes as payment confirmed.
    // statusCode=2 is the standard Grow "approved" code; verify in dashboard.
    const ok = f("status") === "1" || f("statusCode") === "2";
    if (!ok) return { type: "ignore" };

    const subscriptionId = f("recurringId") || f("transactionId") || null;
    const eventId = growIdempotencyKey(
      f("transactionId") || f("asmachta"),
      f("recurringId"),
    );

    if (product.startsWith("pack_")) {
      return { type: "pack_purchased", userId, pack: product.slice("pack_".length) as PackId, eventId };
    }
    const [plan, cycle] = product.split("_");
    return {
      type: "subscription_active",
      userId,
      plan: plan as PlanId,
      cycle: cycle as BillingCycle,
      subscriptionId,
      eventId,
    };
  },
};

// One-time startup warning if Grow is live but pointed at the sandbox — a common
// "configured but no real money collected" footgun.
if (growProvider.isConfigured() && GROW_ENV !== "production") {
  console.warn(
    "[grow] GROW_ENV is not 'production' — checkouts use the SANDBOX and will NOT collect real payments.",
  );
}
