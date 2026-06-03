import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasResendKey, sendEmail, welcomeEmail } from "@/lib/resend";
import { planLabelHe } from "@/lib/plans";
import { hebAuthError, jsonError } from "@/lib/errors";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; full_name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const { email, password, full_name } = body;
  if (!email || !password) return jsonError("חסר אימייל או סיסמה");
  if (password.length < 6) return jsonError("הסיסמה חייבת להכיל לפחות 6 תווים");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: full_name ?? "" } },
  });

  if (error) return jsonError(hebAuthError(error.message));

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
