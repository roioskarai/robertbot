import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/errors";

// POST /api/auth/forgot  body: { email }
// Sends a Supabase password-recovery email. Always returns a generic success
// so the response never reveals whether an account exists (no enumeration).
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return jsonError("נא להזין כתובת אימייל תקינה");
  }

  // Generic success — same response whether or not the email is registered.
  const ok = NextResponse.json({ ok: true });

  // Demo / no real backend → pretend it was sent.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return ok;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    new URL(req.url).origin;

  const supabase = createClient();
  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
  } catch {
    // Swallow — still return generic success (no enumeration / no leak).
  }
  return ok;
}
