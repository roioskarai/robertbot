import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { hebAuthError, jsonError } from "@/lib/errors";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAdminAudit } from "@/lib/admin-audit";

// POST /api/admin/login  { email, password }
// First factor only. On success returns whether 2FA setup or verification is
// needed; the admin 2FA cookie is issued only after the TOTP step.
export async function POST(req: Request) {
  // Throttle admin-password guessing — the most sensitive credential in the app.
  if (!rateLimit(`admin-login:${clientKey(req)}`, 6, 60_000).allowed) {
    return jsonError("יותר מדי נסיונות התחברות. נסה שוב בעוד דקה.", 429);
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const { email, password } = body;
  if (!email || !password) return jsonError("חסר אימייל או סיסמה");

  // Isolated admin context: writes the rb-admin-auth cookie, never the customer session.
  const supabase = await createAdminServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Audit only when the target email belongs to an admin (attack signal,
    // not tenant noise). Never reveals to the caller whether the email exists.
    const adminDb = createAdminClient();
    const { data: byEmail } = await adminDb
      .from("users").select("id, role").eq("email", email).maybeSingle();
    if (byEmail?.role === "admin" || (!!ADMIN_EMAIL && email === ADMIN_EMAIL)) {
      await logAdminAudit(adminDb, {
        action: "auth.login_failed",
        target_type: "user",
        target_id: byEmail?.id,
        target_label: email,
        meta: { ip: clientKey(req), reason: "bad_password" },
      });
    }
    return jsonError(hebAuthError(error?.message ?? "שגיאה"));
  }

  // Verify admin role via service-role (bypass RLS).
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, totp_enabled, is_suspended")
    .eq("id", data.user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || (!!ADMIN_EMAIL && email === ADMIN_EMAIL);
  if (!isAdmin || profile?.is_suspended) {
    await supabase.auth.signOut();
    if (isAdmin && profile?.is_suspended) {
      await logAdminAudit(admin, {
        action: "auth.login_failed",
        target_type: "user",
        target_id: data.user.id,
        target_label: email,
        meta: { ip: clientKey(req), reason: "suspended" },
      });
    }
    return jsonError("אין הרשאת אדמין", 403);
  }

  await admin.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);

  return NextResponse.json({
    ok: true,
    needsSetup: !profile?.totp_enabled,
    needs2fa: Boolean(profile?.totp_enabled),
  });
}
