import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/me — current admin identity + 2FA status.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("email, totp_enabled, last_login_at")
    .eq("id", session.authId)
    .maybeSingle();
  return NextResponse.json({
    email: session.email,
    totp_enabled: Boolean(data?.totp_enabled),
    last_login_at: data?.last_login_at ?? null,
  });
}
