import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdminPreTotp, signAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";
import { verifyTotp } from "@/lib/totp";
import { decryptSecret } from "@/lib/crypto";

// POST /api/admin/2fa/enable  { code }
// Confirms enrollment: verifies the first code, flips totp_enabled, and issues
// the signed 2FA session cookie.
export async function POST(req: Request) {
  const session = await requireAdminPreTotp();
  if (!session) return jsonError("אין הרשאת אדמין", 403);

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  if (!body.code) return jsonError("חסר קוד");

  const admin = createAdminClient();
  const { data } = await admin.from("users").select("totp_secret").eq("id", session.authId).maybeSingle();
  if (!data?.totp_secret) return jsonError("יש להתחיל בהגדרת 2FA", 400);

  const ok = verifyTotp(body.code, decryptSecret(data.totp_secret));
  if (!ok) return jsonError("הקוד שגוי. נסה שוב.", 401);

  await admin.from("users").update({ totp_enabled: true }).eq("id", session.authId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signAdminToken(session.authId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return res;
}
