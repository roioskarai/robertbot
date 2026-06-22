import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/site/permissions";
import { logAudit } from "@/lib/site/admin";
import { revalidateSite } from "@/lib/site/content";

// PUT → update theme name/tokens. If the theme is active, revalidate (design is
// applied live on save — themes have no draft/published split).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "design.write"))
    return unauthorized();
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name;
  if (body.tokens && typeof body.tokens === "object") update.tokens = body.tokens;
  if (Object.keys(update).length === 0) return jsonError("אין שינויים", 400);

  const db = createAdminClient();
  const { data, error } = await db
    .from("themes").update(update).eq("id", params.id).select("id, site_id, is_active").single();
  if (error || !data) return jsonError("עדכון נכשל", 400);

  if (data.is_active) revalidateSite();
  await logAudit(db, {
    site_id: data.site_id, actor_id: session.authId, actor_email: session.email,
    action: "theme.update", entity_type: "theme", entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}

// DELETE → remove a non-default, non-active theme
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "design.write"))
    return unauthorized();
  const db = createAdminClient();
  const { data: theme } = await db
    .from("themes").select("is_default, is_active, site_id").eq("id", params.id).single();
  if (!theme) return jsonError("לא נמצא", 404);
  if (theme.is_default) return jsonError("אי אפשר למחוק את ערכת ברירת המחדל", 400);
  if (theme.is_active) return jsonError("אי אפשר למחוק ערכה פעילה", 400);
  await db.from("themes").delete().eq("id", params.id);
  await logAudit(db, {
    site_id: theme.site_id, actor_id: session.authId, actor_email: session.email,
    action: "theme.delete", entity_type: "theme", entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
