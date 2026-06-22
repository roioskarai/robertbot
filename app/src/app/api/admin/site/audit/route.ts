import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite } from "@/lib/site/admin";

// GET → recent audit-log entries (all builder changes).
export async function GET() {
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data } = await db
    .from("audit_log")
    .select("id, actor_email, action, entity_type, entity_id, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(150);
  return NextResponse.json({ entries: data ?? [] });
}
