import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /auth/callback?code=...&next=/reset-password
// Exchanges a Supabase auth code (password recovery / magic link) for a session
// cookie, then redirects to the in-app `next` path. Used by the password-reset
// email link. Falls back to /reset-password?error=1 on any failure.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") || "/reset-password";
  // Only allow internal redirects (guard against open-redirect).
  const next = nextParam.startsWith("/") ? nextParam : "/reset-password";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/reset-password?error=1", url.origin));
}
