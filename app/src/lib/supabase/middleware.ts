import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_OPTIONS } from "./admin-cookie";

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

  const path = request.nextUrl.pathname;

  // ── Admin area — ISOLATED auth context ─────────────────────────────────
  // Admin paths refresh ONLY the admin cookie (rb-admin-auth) and gate on the
  // DB role server-side. The customer cookie is never read or written here, so
  // a logged-in customer can never leak into the admin context, and a customer
  // tab's token refresh can never clobber the admin session.
  if (path.startsWith("/admin")) {
    return await handleAdmin(request);
  }

  // ── Customer area ──────────────────────────────────────────────────────
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

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return res;
}

/**
 * Admin middleware branch. Refreshes the isolated admin session and enforces
 * the admin role in the DB (server-side) as the first line of defense. The
 * authoritative gate (role + 2FA) remains requireAdmin() in the (panel) layout.
 */
async function handleAdmin(request: NextRequest): Promise<NextResponse> {
  let res = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: ADMIN_COOKIE_OPTIONS,
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
    user = null;
  }

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  };

  // Let the login page render for everyone (including logged-in customers).
  const needsGate = !request.nextUrl.pathname.startsWith("/admin/login");
  if (needsGate) {
    if (!user) return redirectToLogin();
    // Server-side role check against the DB — never trust "who is logged in".
    let role: string | null = null;
    try {
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (data?.role as string) ?? null;
    } catch {
      role = null;
    }
    if (role !== "admin") return redirectToLogin();
  }

  // Never let a shared cache retain the Set-Cookie / admin responses.
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
