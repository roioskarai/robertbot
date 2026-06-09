// Provider-agnostic WhatsApp types.
// Critical multi-tenant invariant: every outbound message is sent FROM the
// specific tenant bot's own connected sender (bot.whatsapp_number / WABA),
// never a shared global number — so one tenant is fully isolated from another.

import type { Bot } from "@/lib/types";

export type WhatsAppProviderId = "twilio" | "meta";

export interface WhatsAppProvider {
  readonly id: WhatsAppProviderId;
  /** True when the required env keys are present (else demo mode). */
  isConfigured(): boolean;
  /**
   * Send a message to `to`, FROM the given tenant bot's own sender.
   * Throws on transport errors (callers decide whether to swallow).
   */
  sendMessage(bot: Bot, to: string, body: string): Promise<void>;
  /** Render quick-reply buttons in the provider's supported format. */
  formatButtons(text: string, buttons: string[]): string;
}
