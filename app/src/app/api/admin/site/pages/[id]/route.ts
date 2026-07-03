import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { logAudit } from "@/lib/site/admin";

// GET → full page row (for the editor)
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const { data, error } = await db.from("pages").select("*").eq("id", params.id).single();
  if (error || !data) return jsonError("העמוד לא נמצא", 404);
  return NextResponse.json({ page: data });
}

// PUT → save draft (draft_doc / meta / title / slug / scheduling / taxonomy)
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if (body.draft_doc && typeof body.draft_doc === "object") update.draft_doc = body.draft_doc;
  if (body.meta && typeof body.meta === "object") update.meta = body.meta;
  if (typeof body.title === "string") update.title = body.title;
  if (typeof body.scheduled_at === "string" || body.scheduled_at === null)
    update.scheduled_at = body.scheduled_at;
  if (typeof body.category_id === "string" || body.category_id === null)
    update.category_id = body.category_id;
  if (typeof body.author_id === "string" || body.author_id === null)
    update.author_id = body.author_id;
  if (Object.keys(update).length === 0) return jsonError("אין שינויים לשמירה", 400);

  const db = createAdminClient();
  const { data, error } = await db
    .from("pages").update(update).eq("id", params.id)
    .select("id, site_id, title, status, updated_at").single();
  if (error || !data) return jsonError("שמירה נכשלה", 400);

  await logAudit(db, {
    site_id: data.site_id, actor_id: session.authId, actor_email: session.email,
    action: "page.save_draft", entity_type: "page", entity_id: params.id,
  });
  return NextResponse.json({ page: data });
}

// DELETE → remove a page (not the home page)
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const { data: page } = await db.from("pages").select("kind, site_id").eq("id", params.id).single();
  if (page?.kind === "home") return jsonError("אי אפשר למחוק את דף הבית", 400);
  const { error } = await db.from("pages").delete().eq("id", params.id);
  if (error) return jsonError("מחיקה נכשלה", 400);
  if (page) await logAudit(db, {
    site_id: page.site_id, actor_id: session.authId, actor_email: session.email,
    action: "page.delete", entity_type: "page", entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
