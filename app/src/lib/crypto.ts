// Symmetric encryption for tenant secrets at rest (WABA access tokens).
// AES-256-GCM, key derived from WA_TOKEN_ENC_KEY. Stored format:
//   v1:<iv-b64>:<authTag-b64>:<ciphertext-b64>
//
// If WA_TOKEN_ENC_KEY is unset in DEMO mode, encrypt() returns the value
// unchanged and decrypt() passes it through — so local dev still runs. In a
// real (non-demo) deployment the key is REQUIRED: encryptSecret() throws rather
// than persisting a tenant token in plaintext (fail-closed).

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { isDemoMode } from "./env";

const PREFIX = "v1:";

function key(): Buffer | null {
  const secret = process.env.WA_TOKEN_ENC_KEY;
  if (!secret) return null;
  // Normalize any secret string to a 32-byte key.
  return createHash("sha256").update(secret).digest();
}

export function hasEncryptionKey(): boolean {
  return Boolean(process.env.WA_TOKEN_ENC_KEY);
}

/**
 * Encrypts plaintext. In demo mode (no key) returns the value unchanged so
 * local dev runs; in a real deployment a missing key throws (never store a
 * tenant token in plaintext).
 */
export function encryptSecret(plaintext: string): string {
  const k = key();
  if (!k) {
    if (isDemoMode()) return plaintext;
    throw new Error("WA_TOKEN_ENC_KEY missing — refusing to store tenant token in plaintext");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Decrypts a value produced by encryptSecret. Pass-through for plaintext. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // plaintext / legacy
  const k = key();
  if (!k) throw new Error("WA_TOKEN_ENC_KEY missing — cannot decrypt token");
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", k, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
