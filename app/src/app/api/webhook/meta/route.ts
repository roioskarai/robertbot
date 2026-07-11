import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logWebhookSignatureFailure } from "@/lib/admin-audit";
import { processInboundMessage } from "@/lib/whatsapp/inbound";
import { MAX_WEBHOOK_BYTES, declaredBodyTooLarge } from "@/lib/validation";
import type { Bot } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET — Meta webhook verification handshake (Configuration → Verify token).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

/** Verify Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body, app secret). */
function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(got, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

interface MetaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
}

function messageText(m: MetaMessage): string {
  if (m.text?.body) return m.text.body;
  if (m.button?.text) return m.button.text;
  if (m.interactive?.button_reply?.title) return m.interactive.button_reply.title;
  if (m.interactive?.list_reply?.title) return m.interactive.list_reply.title;
  return "";
}

// POST — Meta WhatsApp Cloud API inbound. Routes by phone_number_id so each
// tenant's WABA is fully isolated.
export async function POST(req: Request) {
  if (!process.env.META_APP_SECRET) {
    // Config warning — not a client error. Log server-side and reject safely.
    console.error("[meta-webhook] META_APP_SECRET not set — all inbound messages rejected");
    return new NextResponse("not configured", { status: 503 });
  }
  if (declaredBodyTooLarge(req)) {
    return new NextResponse("payload too large", { status: 413 });
  }
  const raw = await req.text();
  if (raw.length > MAX_WEBHOOK_BYTES) {
    return new NextResponse("payload too large", { status: 413 });
  }
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    await logWebhookSignatureFailure("meta", req.headers.get("x-forwarded-for"));
    return new NextResponse("invalid signature", { status: 403 });
  }

  let payload: {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          contacts?: Array<{ profile?: { name?: string } }>;
          messages?: MetaMessage[];
        };
      }>;
    }>;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const messages = value?.messages;
      if (!phoneNumberId || !messages?.length) continue;

      // Resolve the tenant bot by its OWN phone_number_id (isolation).
      const { data: bot } = await supabase
        .from("bots")
        .select("*")
        .eq("meta_phone_number_id", phoneNumberId)
        .maybeSingle();
      if (!bot) continue;

      const profileName = value?.contacts?.[0]?.profile?.name ?? null;
      for (const m of messages) {
        const body = messageText(m).trim();
        if (!body) continue;
        await processInboundMessage({
          bot: bot as Bot,
          customerPhone: m.from,
          body,
          messageId: m.id || null,
          profileName,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
