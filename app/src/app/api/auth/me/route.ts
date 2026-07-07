import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// GET /api/auth/me — minimal server-truth auth probe for the marketing nav.
// Cookie-based (getSessionUser), so it is correct even when the browser-side
// Supabase client can't hydrate a session — the failure mode that left
// logged-in users seeing "כניסה/הרשמה" instead of "האזור האישי".
export async function GET() {
  const session = await getSessionUser().catch(() => null);
  return NextResponse.json(
    { authenticated: !!session },
    { headers: { "Cache-Control": "no-store" } },
  );
}
