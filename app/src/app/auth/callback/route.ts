import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// GET /auth/callback?code=...&next=/path
// Two flows:
// 1. PKCE code exchange (classic Supabase email templates / password reset)
// 2. token_hash (newer Supabase templates — no PKCE verifier cookie required)
// Guards against open-redirect: only internal paths allowed for `next`.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "") as EmailOtpType;
  const nextParam = url.searchParams.get("next") || "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  const supabase = await createClient();

  // Flow 1: PKCE authorization code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Flow 2: token_hash (newer Supabase email templates)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Route the error to the page that matches the flow
  const isSignupFlow = next.includes("onboarding") || type === "email" || type === "signup";
  if (isSignupFlow) {
    return NextResponse.redirect(new URL("/onboarding?verify-error=1", url.origin));
  }
  return NextResponse.redirect(new URL("/reset-password?error=1", url.origin));
}
