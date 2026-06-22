import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite } from "@/lib/site/admin";

// GET → newsletter subscribers (most recent first)
export async function GET() {
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data } = await db
    .from("newsletter_subscribers")
    .select("id, email, source, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(500);
  return NextResponse.json({ subscribers: data ?? [] });
}
