import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { jsonError } from "@/lib/errors";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { ensurePrimarySite } from "@/lib/site/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public newsletter / email capture. Rate-limited, validated, idempotent.
export async function POST(req: NextRequest) {
  if (!rateLimit("nl:" + clientKey(req), 5, 60_000).allowed)
    return jsonError("יותר מדי ניסיונות, נסו שוב מאוחר יותר", 429);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const source = String(body.source ?? "").slice(0, 60) || null;
  if (!EMAIL_RE.test(email)) return jsonError("כתובת מייל לא תקינה", 400);

  if (isDemoMode()) return NextResponse.json({ ok: true });

  try {
    const db = createAdminClient();
    const siteId = await ensurePrimarySite(db);
    await db
      .from("newsletter_subscribers")
      .upsert({ site_id: siteId, email, source }, { onConflict: "site_id,email", ignoreDuplicates: true });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("שמירה נכשלה", 500);
  }
}
