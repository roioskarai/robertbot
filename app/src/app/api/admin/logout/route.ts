import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-session";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

// POST /api/admin/logout — clears the admin session + 2FA cookie ONLY.
// Uses the isolated admin context so a customer session in the same browser
// stays intact.
export async function POST() {
  const supabase = await createAdminServerClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
