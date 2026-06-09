import { NextResponse } from "next/server";
import { growProvider } from "@/lib/payments/grow-provider";
import { applyPaymentEvent } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Grow (Meshulam) server-to-server callback. Verifies the shared secret,
// normalizes the payload and applies it. Configure this URL as the "notify"
// endpoint in the Grow dashboard.
export async function POST(req: Request) {
  if (!growProvider.isConfigured()) {
    return NextResponse.json({ error: "Grow not configured" }, { status: 503 });
  }
  try {
    const event = await growProvider.parseWebhook(req);
    await applyPaymentEvent(event);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "webhook failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ received: true });
}
