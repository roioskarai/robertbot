import { NextResponse } from "next/server";
import { growProvider } from "@/lib/payments/grow-provider";
import { applyPaymentEvent } from "@/lib/payments";
import { logWebhookSignatureFailure } from "@/lib/admin-audit";
import { declaredBodyTooLarge } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Grow (Meshulam) server-to-server callback. Verifies the shared secret,
// normalizes the payload and applies it. Configure this URL as the "notify"
// endpoint in the Grow dashboard.
export async function POST(req: Request) {
  if (!growProvider.isConfigured()) {
    return NextResponse.json({ error: "Grow not configured" }, { status: 503 });
  }
  if (declaredBodyTooLarge(req)) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  try {
    const event = await growProvider.parseWebhook(req);
    await applyPaymentEvent(event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "webhook failed";
    if (/signature/i.test(msg)) {
      await logWebhookSignatureFailure("grow", req.headers.get("x-forwarded-for"));
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ received: true });
}
