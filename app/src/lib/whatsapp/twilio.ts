// Twilio implementation of the WhatsAppProvider interface.
// Phase 1 provider: Twilio acts as the BSP/Tech-Provider. Each tenant connects
// its own WhatsApp sender (via Embedded Signup / number registration), and we
// send FROM that tenant's own number — keeping tenants isolated.

import { hasTwilioCreds, sendWhatsApp, appendButtons } from "@/lib/twilio";
import type { Bot } from "@/lib/types";
import type { WhatsAppProvider } from "./types";

export const twilioProvider: WhatsAppProvider = {
  id: "twilio",

  isConfigured() {
    return hasTwilioCreds();
  },

  async sendMessage(bot: Bot, to: string, body: string): Promise<void> {
    // Send FROM the bot's own connected number for tenant isolation.
    await sendWhatsApp(to, body, bot.whatsapp_number ?? undefined);
  },

  formatButtons(text: string, buttons: string[]): string {
    return appendButtons(text, buttons);
  },
};
