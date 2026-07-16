// WhatsApp provider selector. Active provider chosen by WHATSAPP_PROVIDER
// (default: "twilio"). Routes import ONLY from here — never a provider SDK
// directly — so the Twilio → Meta-direct migration is a one-line change.

import { twilioProvider } from "./twilio";
import { metaProvider } from "./meta";
import type { WhatsAppProvider, WhatsAppProviderId } from "./types";

export * from "./types";

const PROVIDERS: Record<WhatsAppProviderId, WhatsAppProvider> = {
  twilio: twilioProvider,
  meta: metaProvider,
};

function selectedId(): WhatsAppProviderId {
  const id = (process.env.WHATSAPP_PROVIDER || "twilio").toLowerCase();
  return id === "meta" ? "meta" : "twilio";
}

/**
 * The WhatsApp provider to use. Pass a bot's own `wa_provider` so a
 * Meta-connected tenant is never routed through the (possibly different)
 * global default — falls back to the env default when omitted/unset.
 */
export function getWhatsAppProvider(botProvider?: string | null): WhatsAppProvider {
  const id: WhatsAppProviderId =
    botProvider === "meta" ? "meta" : botProvider === "twilio" ? "twilio" : selectedId();
  return PROVIDERS[id];
}

/** True when the active provider has its keys configured (else demo mode). */
export function hasWhatsApp(): boolean {
  return getWhatsAppProvider().isConfigured();
}
