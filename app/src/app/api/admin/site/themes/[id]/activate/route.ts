import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/site/permissions";
import { logAudit } from "@/lib/site/admin";
import { revalidateSite } from "@/lib/site/content";

// Make a theme the active one (deactivate the rest) + revalidate.
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "design.write"))
    return unauthorized();

  const db = createAdminClient();
  const { data: theme } = await db.from("themes").select("site_id").eq("id", params.id).single();
  if (!theme) return jsonError("לא נמצא", 404);

  await db.from("themes").update({ is_active: false }).eq("site_id", theme.site_id);
  await db.from("themes").update({ is_active: true }).eq("id", params.id);
  await db.from("site_settings").update({ active_theme_id: params.id }).eq("site_id", theme.site_id);

  revalidateSite();
  await logAudit(db, {
    site_id: theme.site_id, actor_id: session.authId, actor_email: session.email,
    action: "theme.activate", entity_type: "theme", entity_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
