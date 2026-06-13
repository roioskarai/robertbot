import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = ["/dashboard", "/preview"];

/**
 * Refreshes the Supabase auth session on every request and guards
 * protected routes. Returns the (possibly redirected) response.
 */
/** True when real Supabase keys are configured (not the dev placeholders). */
function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return Boolean(url) && !url.includes("placeholder") && Boolean(key) && !key.includes("placeholder");
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Demo mode (no real Supabase keys): don't lock the user out — let them
  // walk the dashboard/preview with fallback data.
  if (!supabaseConfigured()) {
    return response;
  }

  let res = response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          res = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Supabase unreachable — treat as logged out.
    user = null;
  }

  const path = request.nextUrl.pathname;

  // Admin area — first line of defense (full role + 2FA gate is in the
  // (panel) layout via requireAdmin). Allow the login page through.
  const isAdminArea = path.startsWith("/admin") && !path.startsWith("/admin/login");
  if (isAdminArea && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return res;
}
