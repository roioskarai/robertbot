// TOTP (Google Authenticator) helpers — RFC 6238, via otplib.
// Secrets are stored ENCRYPTED at rest (lib/crypto.ts). This module only
// generates/validates codes and the otpauth:// provisioning URI.

import { authenticator } from "otplib";
import QRCode from "qrcode";

// Allow ±1 time-step (30s) of clock drift on validation.
authenticator.options = { window: 1, step: 30 };

const ISSUER = "Robert Admin";

/** Generate a fresh base32 TOTP secret. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/** Build the otpauth:// URI used to render the enrollment QR. */
export function totpUri(secret: string, accountEmail: string): string {
  return authenticator.keyuri(accountEmail, ISSUER, secret);
}

/** Render the otpauth URI as a data-URL PNG (for <img src>). */
export async function totpQrDataUrl(secret: string, accountEmail: string): Promise<string> {
  return QRCode.toDataURL(totpUri(secret, accountEmail), { margin: 1, width: 220 });
}

/** Validate a 6-digit code against the secret (constant-time inside otplib). */
export function verifyTotp(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code.trim(), secret });
  } catch {
    return false;
  }
}
