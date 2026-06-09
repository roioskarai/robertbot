// Grow (formerly Meshulam) implementation of the PaymentProvider interface.
// Uses Grow's "Light Server" API. Grow returns a hosted payment-page URL we
// redirect the customer to; recurring billing + Hebrew tax invoices are handled
// by Grow itself, and a server-to-server callback notifies us of each charge.
//
// ⚠️ Owner action: confirm GROW_USER_ID / GROW_PAGE_CODE / GROW_API_KEY from the
// Grow dashboard, and the exact field names below against Grow's current docs
// (https://grow-il.readme.io/). Everything is env-gated so demo mode stays safe.

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
      cField1: input.userId,
      cField2: input.product,
      cField10: process.env.GROW_WEBHOOK_SECRET || "",
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
    // Grow has no native "pause" — stop the recurring charge; the DB marks the
    // subscription paused so the owner can re-create it on resume.
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

    // Verify the shared secret carried in the custom field.
    const secret = process.env.GROW_WEBHOOK_SECRET;
    if (secret && f("cField10") !== secret) {
      throw new Error("Grow webhook secret mismatch");
    }

    const userId = f("cField1");
    const product = f("cField2");
    if (!userId || !product) return { type: "ignore" };

    // Successful transaction status. Grow uses statusCode/transactionTypeId;
    // treat an approved charge as success (confirm exact codes in dashboard).
    const ok =
      f("status") === "1" ||
      f("statusCode") === "2" || // 2 = approved (common Grow code)
      f("transactionTypeId") !== "";
    if (!ok) return { type: "ignore" };

    const subscriptionId = f("recurringId") || f("transactionId") || null;

    if (product.startsWith("pack_")) {
      return { type: "pack_purchased", userId, pack: product.slice("pack_".length) as PackId };
    }
    const [plan, cycle] = product.split("_");
    return {
      type: "subscription_active",
      userId,
      plan: plan as PlanId,
      cycle: cycle as BillingCycle,
      subscriptionId,
    };
  },
};
