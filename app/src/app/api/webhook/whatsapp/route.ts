import { NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInboundMessage } from "@/lib/whatsapp/inbound";
import { isDemoMode } from "@/lib/env";
import { MAX_WEBHOOK_BYTES, declaredBodyTooLarge } from "@/lib/validation";
import type { Bot } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const ok = () =>
  new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });

function stripWa(n: string): string {
  return n.replace(/^whatsapp:/, "").replace(/[\s-]/g, "");
}

/** Matches a Twilio number against a stored bot whatsapp_number (loose). */
function numbersMatch(a: string | null, b: string): boolean {
  if (!a) return false;
  const na = stripWa(a).replace(/^\+?972/, "0").replace(/^\+/, "");
  const nb = stripWa(b).replace(/^\+?972/, "0").replace(/^\+/, "");
  return na === nb || na.endsWith(nb.slice(-9)) || nb.endsWith(na.slice(-9));
}

// Twilio inbound WhatsApp webhook → shared reply pipeline.
export async function POST(req: Request) {
  if (declaredBodyTooLarge(req)) {
    return new NextResponse("payload too large", { status: 413 });
  }
  const raw = await req.text();
  if (raw.length > MAX_WEBHOOK_BYTES) {
    return new NextResponse("payload too large", { status: 413 });
  }
  const params = new URLSearchParams(raw);

  // Twilio signature validation. Fail-closed in any real deployment: without a
  // configured TWILIO_AUTH_TOKEN we refuse to process inbound messages (an empty
  // token must never silently disable signature verification in production).
  // Demo mode (no real Supabase project) skips this so local testing works.
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    if (!isDemoMode()) {
      return new NextResponse("webhook not configured", { status: 503 });
    }
  } else {
    const sig = req.headers.get("x-twilio-signature") || "";
    const obj: Record<string, string> = {};
    params.forEach((v, k) => (obj[k] = v));
    if (!twilio.validateRequest(token, sig, req.url, obj)) {
      return new NextResponse("invalid signature", { status: 403 });
    }
  }

  const from = params.get("From") || ""; // customer
  const to = params.get("To") || ""; // business (bot) number
  const body = (params.get("Body") || "").trim();
  const sid = params.get("MessageSid") || params.get("SmsMessageSid") || "";
  const profileName = params.get("ProfileName") || null;
  if (!from || !body) return ok();

  const supabase = createAdminClient();

  // Resolve the tenant bot by its WhatsApp (business) number.
  const { data: bots } = await supabase
    .from("bots")
    .select("*")
    .not("whatsapp_number", "is", null);
  const bot = (bots as Bot[] | null)?.find((b) => numbersMatch(b.whatsapp_number, to));
  if (!bot) return ok();

  await processInboundMessage({
    bot,
    customerPhone: from,
    body,
    messageId: sid || null,
    profileName,
  });

  return ok();
}
