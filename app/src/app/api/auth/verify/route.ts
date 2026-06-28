import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasResendKey, sendEmail, welcomeEmail } from "@/lib/resend";
import { planLabelHe } from "@/lib/plans";
import { jsonError } from "@/lib/errors";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Brute-force guard: 10 attempts per 10 minutes per IP.
  if (!rateLimit(`verify-otp:${clientKey(req)}`, 10, 600_000).allowed) {
    return jsonError("יותר מדי נסיונות. נסה שוב בעוד מספר דקות.", 429);
  }

  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const { email, code } = body;
  if (!email || !code) return jsonError("חסר אימייל או קוד");
  if (!/^\d{6}$/.test(code)) return jsonError("קוד לא תקין");

  const admin = createAdminClient();

  // Find user by email in our users table (synced from auth.users via trigger).
  const { data: row } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!row?.id) return jsonError("המשתמש לא נמצא");

  // Read OTP from app_metadata (server-only field, never in client session).
  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(row.id);
  if (authErr || !authData.user) return jsonError("אירעה שגיאה. נסה שוב.");

  const meta = (authData.user.app_metadata ?? {}) as {
    otp_code?: string;
    otp_expires?: string;
    otp_attempts?: number;
  };

  if (!meta.otp_code) return jsonError("לא נמצא קוד אימות — בקש קוד חדש.");

  // Max 5 wrong attempts before the OTP is invalidated.
  const attempts = meta.otp_attempts ?? 0;
  if (attempts >= 5) {
    await admin.auth.admin.updateUserById(row.id, {
      app_metadata: { otp_code: null, otp_expires: null, otp_attempts: 0 },
    });
    return jsonError("הקוד נחסם לאחר 5 נסיונות. בקש קוד חדש.");
  }

  // Check expiry.
  const expires = meta.otp_expires ? new Date(meta.otp_expires) : null;
  if (!expires || expires < new Date()) {
    return jsonError("הקוד פג תוקף. בקש קוד חדש.");
  }

  // Check code match.
  if (meta.otp_code !== code) {
    await admin.auth.admin.updateUserById(row.id, {
      app_metadata: { ...meta, otp_attempts: attempts + 1 },
    });
    const left = 4 - attempts;
    return jsonError(`קוד שגוי — נשארו ${left} נסיונות.`);
  }

  // Valid OTP — confirm the user's email and clear the OTP.
  await admin.auth.admin.updateUserById(row.id, {
    email_confirm: true,
    app_metadata: { otp_code: null, otp_expires: null, otp_attempts: 0 },
  });

  // Welcome email (best-effort, after verification).
  if (hasResendKey()) {
    try {
      const { data: userRow } = await admin
        .from("users")
        .select("full_name, plan, trial_ends_at")
        .eq("id", row.id)
        .single();
      if (userRow) {
        const trialEndsAt = userRow.trial_ends_at
          ? new Date(userRow.trial_ends_at).toLocaleDateString("he-IL")
          : "";
        const { subject, html } = welcomeEmail({
          name: userRow.full_name || "",
          plan: planLabelHe(userRow.plan ?? "basic"),
          trialEndsAt,
          email,
        });
        await sendEmail(email, subject, html);
      }
    } catch (e) {
      console.error("[verify] welcome email send failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
