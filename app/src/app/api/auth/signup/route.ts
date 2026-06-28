import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasResendKey, sendEmail, otpEmail } from "@/lib/resend";
import { hebAuthError, jsonError } from "@/lib/errors";
import { isValidEmail, LIMITS } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  if (!rateLimit(`signup:${clientKey(req)}`, 8, 60_000).allowed) {
    return jsonError("יותר מדי נסיונות. נסה שוב בעוד דקה.", 429);
  }

  let body: { email?: string; password?: string; full_name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const { email, password, full_name } = body;
  if (!email || !password) return jsonError("חסר אימייל או סיסמה");
  if (!isValidEmail(email)) return jsonError("כתובת מייל לא תקינה");
  if (password.length < 8) return jsonError("הסיסמה חייבת להכיל לפחות 8 תווים");
  if (password.length > LIMITS.password) return jsonError("הסיסמה ארוכה מדי");

  const admin = createAdminClient();
  let userId: string | null = null;
  let isResend = false;

  // createUser skips Supabase's own email — we send our branded OTP via Resend.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: full_name ?? "" },
  });

  if (error) {
    const m = error.message.toLowerCase();
    const isExisting = m.includes("already") || m.includes("exists") || m.includes("registered");
    if (!isExisting) return jsonError(hebAuthError(error.message));

    // User exists — look up in our users table (trigger syncs auth.users → users).
    const { data: row } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!row?.id) {
      // Not in public.users — find the auth user directly (e.g. public row was
      // manually deleted from Supabase Table Editor while auth user persists).
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const authUser = list?.users?.find((u) => u.email === email);

      if (!authUser) {
        // createUser returned "exists" but user is truly gone (propagation lag).
        // Give it one more try — on failure surface the real error.
        const retry = await admin.auth.admin.createUser({
          email, password, email_confirm: false,
          user_metadata: { full_name: full_name ?? "" },
        });
        if (retry.error) return jsonError(hebAuthError(retry.error.message));
        userId = retry.data.user?.id ?? null;
      } else if (authUser.email_confirmed_at) {
        return jsonError("כתובת המייל כבר רשומה. נסה להתחבר.");
      } else {
        userId = authUser.id;
        isResend = true;
        // Update password + re-create missing public.users row
        await admin.auth.admin.updateUserById(userId, { password });
        await admin.from("users")
          .upsert({ id: userId, email, full_name: full_name ?? "", role: "tenant" }, { onConflict: "id", ignoreDuplicates: true });
      }
    } else {
      // If they're already confirmed, don't resend OTP — just ask to log in.
      const { data: authUser } = await admin.auth.admin.getUserById(row.id);
      if (authUser.user?.email_confirmed_at) {
        return jsonError("כתובת המייל כבר רשומה. נסה להתחבר.");
      }

      userId = row.id;
      isResend = true;
      // Update password in case it changed between attempts
      await admin.auth.admin.updateUserById(row.id, { password });
    }
  } else {
    userId = data.user?.id ?? null;
  }

  if (!userId) return jsonError("ההרשמה נכשלה. נסה שוב.");

  // Generate OTP, store in app_metadata (server-only — never exposed to client session).
  const code = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { otp_code: code, otp_expires: expires, otp_attempts: 0 },
  });

  // Send branded OTP email via Resend (best-effort).
  if (hasResendKey()) {
    try {
      const { subject, html } = otpEmail({ code });
      await sendEmail(email, subject, html);
    } catch { /* email failure never blocks signup */ }
  }

  return NextResponse.json({ ok: true, userId, hasSession: false, resent: isResend });
}
