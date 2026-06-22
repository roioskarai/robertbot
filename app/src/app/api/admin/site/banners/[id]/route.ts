import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { logAudit } from "@/lib/site/admin";
import { revalidateSite } from "@/lib/site/content";

// PUT → update banner (name/config/status/schedule); revalidate so live updates.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  for (const k of ["name", "config", "status", "targeting", "schedule_start", "schedule_end", "position"]) {
    if (body[k] !== undefined) update[k] = body[k];
  }
  if (Object.keys(update).length === 0) return jsonError("אין שינויים", 400);

  const db = createAdminClient();
  const { data, error } = await db.from("banners").update(update).eq("id", params.id).select("site_id").single();
  if (error || !data) return jsonError("עדכון נכשל", 400);

  revalidateSite();
  await logAudit(db, { site_id: data.site_id, actor_id: session.authId, actor_email: session.email, action: "banner.update", entity_type: "banner", entity_id: params.id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const { data } = await db.from("banners").select("site_id").eq("id", params.id).single();
  await db.from("banners").delete().eq("id", params.id);
  revalidateSite();
  if (data) await logAudit(db, { site_id: data.site_id, actor_id: session.authId, actor_email: session.email, action: "banner.delete", entity_type: "banner", entity_id: params.id });
  return NextResponse.json({ ok: true });
}
