import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { logAudit } from "@/lib/site/admin";
import { revalidateSite } from "@/lib/site/content";

// Publish: copy draft_doc → published_doc, snapshot to page_versions, revalidate.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();

  const db = createAdminClient();
  const { data: page, error } = await db
    .from("pages").select("id, site_id, draft_doc, meta").eq("id", params.id).single();
  if (error || !page) return jsonError("העמוד לא נמצא", 404);

  const now = new Date().toISOString();
  const { error: upErr } = await db
    .from("pages")
    .update({
      published_doc: page.draft_doc,
      status: "published",
      published_at: now,
    })
    .eq("id", params.id);
  if (upErr) return jsonError("פרסום נכשל", 400);

  // Version snapshot (for history / restore).
  const label = (await req.json().catch(() => ({})))?.label ?? null;
  await db.from("page_versions").insert({
    page_id: params.id,
    doc: page.draft_doc,
    meta: page.meta,
    label,
    created_by: session.authId,
  });

  revalidateSite();
  await logAudit(db, {
    site_id: page.site_id, actor_id: session.authId, actor_email: session.email,
    action: "page.publish", entity_type: "page", entity_id: params.id,
  });
  return NextResponse.json({ ok: true, published_at: now });
}
