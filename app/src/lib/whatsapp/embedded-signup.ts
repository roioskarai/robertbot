// Meta WhatsApp Embedded Signup — server-side onboarding helpers.
// Flow: the browser launches Embedded Signup (FB SDK) and returns an auth
// `code` + the tenant's `waba_id` + `phone_number_id`. We exchange the code for
// a business token, subscribe our app to the tenant's WABA, and persist the
// connection on the bot row. Each tenant owns its own Portfolio + WABA, so a
// ban on one tenant never affects another.

import { GRAPH, hasMetaCreds } from "./meta";

export interface MetaPublicConfig {
  enabled: boolean;
  appId: string;
  configId: string;
  graphVersion: string;
}

/** Public (non-secret) config the frontend needs to launch Embedded Signup. */
export function metaPublicConfig(): MetaPublicConfig {
  return {
    enabled: hasMetaCreds() && Boolean(process.env.META_CONFIG_ID),
    appId: process.env.META_APP_ID || "",
    configId: process.env.META_CONFIG_ID || "",
    graphVersion: "v21.0",
  };
}

/** Exchange the Embedded Signup authorization code for a business access token. */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
  const json = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(`Meta token exchange failed: ${json.error?.message ?? res.status}`);
  }
  return json.access_token;
}

/** Subscribe our app to the tenant's WABA so we receive its message webhooks. */
export async function subscribeAppToWaba(wabaId: string, token: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Meta subscribe failed: ${res.status} ${await res.text()}`);
  }
}

export interface WabaPhoneInfo {
  phoneNumberId: string;
  displayNumber: string | null;
}

/** Fetch the WABA's first phone number (id + display number) if not supplied. */
export async function fetchWabaPhone(wabaId: string, token: string): Promise<WabaPhoneInfo | null> {
  const res = await fetch(`${GRAPH}/${wabaId}/phone_numbers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: Array<{ id: string; display_phone_number?: string }>;
  };
  const first = json.data?.[0];
  if (!first) return null;
  return { phoneNumberId: first.id, displayNumber: first.display_phone_number ?? null };
}

/** Unsubscribe our app from a tenant's WABA (used on disconnect). Best-effort. */
export async function unsubscribeAppFromWaba(wabaId: string, token: string): Promise<void> {
  await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
