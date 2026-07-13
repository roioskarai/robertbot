import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { DBUser } from "../types";
import { ADMIN_COOKIE_OPTIONS } from "./admin-cookie";

/**
 * Admin auth context — DELIBERATELY ISOLATED from the customer session.
 *
 * The customer app and the admin panel run on the same domain and the same
 * Supabase project. If they shared the default `sb-<ref>-auth-token` cookie,
 * a logged-in customer's session would leak into the admin context, and an
 * open customer tab (auto-refreshing its token) would clobber a freshly-issued
 * admin session. To prevent both, the admin session lives in its OWN cookie
 * namespace (ADMIN_COOKIE_OPTIONS.name), pinned via `cookieOptions.name` which
 * @supabase/ssr uses as the auth `storageKey`, i.e. the cookie base name —
 * verified in node_modules/@supabase/ssr createServerClient.js.
 */
export { ADMIN_STORAGE_KEY, ADMIN_COOKIE_OPTIONS } from "./admin-cookie";

/**
 * Supabase server client bound to the ADMIN cookie namespace.
 * Use for every admin Route Handler that reads/writes the admin session
 * (login, logout, requireAdmin path). Never use for customer routes.
 */
export async function createAdminServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: ADMIN_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // Session refresh is handled by middleware, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Admin-only session reader — reads the `rb-admin-auth` cookie, NOT the
 * customer cookie. Mirrors getSessionUser() but on the isolated context.
 * Returns the auth user + their `users` profile row, or null.
 */
export async function getAdminSessionUser(): Promise<{
  authId: string;
  email: string;
  profile: DBUser | null;
} | null> {
  const supabase = await createAdminServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    authId: user.id,
    email: user.email ?? "",
    profile: (profile as DBUser) ?? null,
  };
}
