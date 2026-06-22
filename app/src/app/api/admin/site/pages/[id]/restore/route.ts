import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { logAudit } from "@/lib/site/admin";

// Restore a version into the DRAFT (admin reviews, then publishes).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const { versionId } = await req.json().catch(() => ({}));
  if (!versionId) return jsonError("נדרש מזהה גרסה", 400);

  const db = createAdminClient();
  const { data: version } = await db
    .from("page_versions").select("doc, meta, page_id").eq("id", versionId).single();
  if (!version || version.page_id !== params.id) return jsonError("הגרסה לא נמצאה", 404);

  const { data: page, error } = await db
    .from("pages")
    .update({ draft_doc: version.doc, ...(version.meta ? { meta: version.meta } : {}) })
    .eq("id", params.id)
    .select("site_id").single();
  if (error || !page) return jsonError("שחזור נכשל", 400);

  await logAudit(db, {
    site_id: page.site_id, actor_id: session.authId, actor_email: session.email,
    action: "page.restore_version", entity_type: "page", entity_id: params.id,
    diff: { versionId },
  });
  return NextResponse.json({ ok: true });
}
