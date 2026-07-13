// Admin auth cookie namespace — kept in its OWN module (no next/headers import)
// so the edge middleware can import these constants without pulling in a
// Server-Component-only dependency.
//
// Pinning `cookieOptions.name` makes @supabase/ssr use it as the auth
// storageKey, i.e. the admin session lives in its own cookie base name and can
// never collide with or clobber the customer `sb-<ref>-auth-token`.

export const ADMIN_STORAGE_KEY = "rb-admin-auth";

export const ADMIN_COOKIE_OPTIONS = {
  name: ADMIN_STORAGE_KEY,
  // Safe ONLY while the admin panel stays fetch-only (no admin browser Supabase
  // client reads this cookie). If that changes, httpOnly must become false.
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
