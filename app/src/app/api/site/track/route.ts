import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { ensurePrimarySite } from "@/lib/site/admin";

const TYPES = new Set(["pageview", "click", "conversion"]);

// Public, fire-and-forget analytics beacon. Returns 204 quickly.
export async function POST(req: NextRequest) {
  if (!rateLimit("trk:" + clientKey(req), 60, 60_000).allowed)
    return new NextResponse(null, { status: 204 });

  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "");
  if (!TYPES.has(type)) return new NextResponse(null, { status: 204 });

  if (isDemoMode()) return new NextResponse(null, { status: 204 });

  try {
    const db = createAdminClient();
    const siteId = await ensurePrimarySite(db);
    await db.from("site_events").insert({
      site_id: siteId,
      type,
      path: String(body.path ?? "").slice(0, 300) || null,
      referrer: String(body.referrer ?? "").slice(0, 300) || null,
      session_id: String(body.sessionId ?? "").slice(0, 80) || null,
      meta: typeof body.meta === "object" && body.meta ? body.meta : {},
    });
  } catch {
    /* ignore — analytics must never break the page */
  }
  return new NextResponse(null, { status: 204 });
}
