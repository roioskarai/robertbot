import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";

// GET → all banners; POST → create banner
export async function GET() {
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data } = await db
    .from("banners").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
  return NextResponse.json({ banners: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const kind = ["announcement", "homepage", "floating", "popup", "exit_intent"].includes(body.kind)
    ? body.kind : "popup";
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data, error } = await db
    .from("banners")
    .insert({ site_id: siteId, kind, name: body.name ?? "באנר חדש", config: body.config ?? {}, status: "draft" })
    .select("*").single();
  if (error) return jsonError("יצירה נכשלה", 400);
  await logAudit(db, { site_id: siteId, actor_id: session.authId, actor_email: session.email, action: "banner.create", entity_type: "banner", entity_id: data.id });
  return NextResponse.json({ banner: data });
}
