import twilio from "twilio";

let _client: twilio.Twilio | null = null;

export function hasTwilioCreds(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
  );
}

export function getTwilio(): twilio.Twilio {
  if (!hasTwilioCreds()) {
    throw new Error("חיבור Twilio אינו מוגדר — חסרים SID/Token");
  }
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
  }
  return _client;
}

/** Normalises a phone number into Twilio WhatsApp format. */
export function toWhatsApp(phone: string): string {
  let p = phone.trim();
  if (p.startsWith("whatsapp:")) return p;
  p = p.replace(/[\s-]/g, "");
  // Israeli local numbers (05X...) → +972
  if (p.startsWith("0")) p = "+972" + p.slice(1);
  if (!p.startsWith("+")) p = "+" + p;
  return "whatsapp:" + p;
}

/**
 * Sends a WhatsApp message via Twilio.
 * `from` is the tenant bot's OWN connected sender — pass it for multi-tenant
 * isolation. Falls back to the global TWILIO_WHATSAPP_NUMBER only when a bot
 * has no connected number yet (e.g. shared onboarding sandbox).
 */
export async function sendWhatsApp(to: string, body: string, from?: string) {
  const client = getTwilio();
  const sender = from ? toWhatsApp(from) : process.env.TWILIO_WHATSAPP_NUMBER!;
  return client.messages.create({
    from: sender,
    to: toWhatsApp(to),
    body,
  });
}

/** Starts a phone verification (SMS OTP) via Twilio Verify. */
export async function startVerification(phone: string) {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error("TWILIO_VERIFY_SERVICE_SID חסר");
  const client = getTwilio();
  const e164 = toWhatsApp(phone).replace("whatsapp:", "");
  return client.verify.v2
    .services(sid)
    .verifications.create({ to: e164, channel: "sms" });
}

/** Checks a phone verification code via Twilio Verify. */
export async function checkVerification(phone: string, code: string) {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error("TWILIO_VERIFY_SERVICE_SID חסר");
  const client = getTwilio();
  const e164 = toWhatsApp(phone).replace("whatsapp:", "");
  return client.verify.v2
    .services(sid)
    .verificationChecks.create({ to: e164, code });
}

/**
 * Renders quick-reply buttons as plain WhatsApp text. Twilio's basic
 * messaging API doesn't support native buttons, so we append them as a
 * numbered list — matching the [BUTTONS: ...] convention.
 */
export function appendButtons(text: string, buttons: string[]): string {
  if (!buttons.length) return text;
  const list = buttons.map((b) => `▪️ ${b}`).join("\n");
  return `${text}\n\n${list}`;
}
