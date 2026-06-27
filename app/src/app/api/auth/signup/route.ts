import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasResendKey, sendEmail, welcomeEmail } from "@/lib/resend";
import { planLabelHe } from "@/lib/plans";
import { hebAuthError, jsonError } from "@/lib/errors";
import { isValidEmail, LIMITS } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

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

  const supabase = createClient();
  // After the user confirms their email, land them back in the app (logged in)
  // to finish onboarding (#3). Uses the app URL in prod, request origin otherwise.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent("/onboarding?new=1")}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: full_name ?? "" }, emailRedirectTo },
  });

  // Rate-limit or "already sent" → the email already exists but isn't confirmed.
  // Treat it as "check your inbox" rather than surfacing a confusing error.
  if (error) {
    const m = error.message.toLowerCase();
    const isRateLimit = m.includes("rate limit") || m.includes("email sending");
    const isAlreadySent = m.includes("already registered") || m.includes("already exists") || m.includes("user already");
    if (isRateLimit || isAlreadySent) {
      // Resend the confirmation if possible (best-effort, ignore errors)
      try {
        await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } });
      } catch { /* ignore */ }
      return NextResponse.json({ ok: true, userId: null, hasSession: false, resent: true });
    }
    return jsonError(hebAuthError(error.message));
  }

  // Welcome email (best-effort — never blocks signup)
  if (hasResendKey()) {
    try {
      const trialEndsAt = new Date(Date.now() + 7 * 86_400_000).toLocaleDateString("he-IL");
      const { subject, html } = welcomeEmail({
        name: full_name || "",
        plan: planLabelHe("basic"),
        trialEndsAt,
        email,
      });
      await sendEmail(email, subject, html);
    } catch {
      /* ignore email failures */
    }
  }

  return NextResponse.json({
    ok: true,
    userId: data.user?.id ?? null,
    hasSession: Boolean(data.session),
  });
}
