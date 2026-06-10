import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin, requireAdminPreTotp } from "@/lib/admin-auth";
import { generateTotpSecret, totpQrDataUrl } from "@/lib/totp";
import { encryptSecret } from "@/lib/crypto";

// POST /api/admin/2fa/setup
// Generates a fresh TOTP secret, stores it ENCRYPTED (not yet enabled), and
// returns the QR + manual key for Google Authenticator enrollment.
//
// Security: first-time enrollment only needs the password (pre-TOTP). But once
// 2FA is ALREADY enabled, resetting it requires the current 2FA — otherwise an
// attacker with just the password could re-enroll their own device.
export async function POST() {
  const session = await requireAdminPreTotp();
  if (!session) return jsonError("אין הרשאת אדמין", 403);

  const db = createAdminClient();
  const { data: cur } = await db
    .from("users")
    .select("totp_enabled")
    .eq("id", session.authId)
    .maybeSingle();
  if (cur?.totp_enabled && !(await requireAdmin())) {
    return jsonError("איפוס 2FA דורש אימות עם הקוד הנוכחי", 403);
  }

  const secret = generateTotpSecret();
  await db
    .from("users")
    .update({ totp_secret: encryptSecret(secret), totp_enabled: false })
    .eq("id", session.authId);

  const qr = await totpQrDataUrl(secret, session.email);
  return NextResponse.json({ qr, manualKey: secret });
}
