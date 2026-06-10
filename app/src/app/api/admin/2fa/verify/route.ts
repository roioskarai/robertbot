import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdminPreTotp, signAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";
import { verifyTotp } from "@/lib/totp";
import { decryptSecret } from "@/lib/crypto";

// POST /api/admin/2fa/verify  { code }
// Second-factor check at login. Issues the signed 2FA session cookie on success.
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
  const { data } = await admin
    .from("users")
    .select("totp_secret, totp_enabled")
    .eq("id", session.authId)
    .maybeSingle();
  if (!data?.totp_enabled || !data.totp_secret) return jsonError("2FA אינו מופעל", 400);

  const ok = verifyTotp(body.code, decryptSecret(data.totp_secret));
  if (!ok) return jsonError("הקוד שגוי. נסה שוב.", 401);

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
