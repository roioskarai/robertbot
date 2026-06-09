// Meta WhatsApp Cloud API implementation (Phase 2 — direct Tech Provider).
// Each tenant owns its own Meta Business Portfolio + WABA (via Embedded Signup),
// so a ban on one tenant's number/WABA NEVER affects another tenant.
//
// Sending uses the tenant's own phone_number_id + access token, which must be
// stored (encrypted) on the bot row. Wired behind the same WhatsAppProvider
// interface so switching from Twilio is a one-line selector change.
//
// ⚠️ Activated only when META_APP_ID/META_APP_SECRET are set AND the bot has a
// connected WABA. Until then the selector defaults to Twilio.

import type { Bot } from "@/lib/types";
import type { WhatsAppProvider } from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";

export function hasMetaCreds(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/** A bot is Meta-connected once it has its own WABA phone number + token. */
function metaSender(bot: Bot): { phoneNumberId: string; token: string } | null {
  if (bot.meta_phone_number_id && bot.wa_access_token) {
    return { phoneNumberId: bot.meta_phone_number_id, token: bot.wa_access_token };
  }
  return null;
}

export const metaProvider: WhatsAppProvider = {
  id: "meta",

  isConfigured() {
    return hasMetaCreds();
  },

  async sendMessage(bot: Bot, to: string, body: string): Promise<void> {
    const sender = metaSender(bot);
    if (!sender) throw new Error("הבוט אינו מחובר ל-WhatsApp (WABA חסר)");
    const res = await fetch(`${GRAPH}/${sender.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sender.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^whatsapp:/, "").replace(/[\s-]/g, ""),
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) {
      throw new Error(`Meta send failed: ${res.status} ${await res.text()}`);
    }
  },

  formatButtons(text: string, buttons: string[]): string {
    // Cloud API supports native interactive buttons; for now keep the same
    // numbered-list convention used elsewhere to avoid format drift.
    if (!buttons.length) return text;
    return `${text}\n\n${buttons.map((b) => `▪️ ${b}`).join("\n")}`;
  },
};
