import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";

const ROLES = ["super_admin", "admin", "editor", "support"];

// GET → admin team members; PUT → set a member's admin_role.
export async function GET() {
  const session = await requirePermission("team.manage");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("id, email, full_name, role, admin_role, last_login_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });
  return NextResponse.json({ members: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const session = await requirePermission("team.manage");
  if (!session) return unauthorized();
  const { id, admin_role } = await req.json().catch(() => ({}));
  if (!id || !ROLES.includes(admin_role)) return jsonError("פרמטרים לא תקינים", 400);
  // Guard against self-lockout: a super_admin can't demote themselves.
  if (id === session.authId && admin_role !== "super_admin")
    return jsonError("אי אפשר להוריד את ההרשאות של עצמך", 400);

  const db = createAdminClient();
  const { error } = await db.from("users").update({ admin_role }).eq("id", id);
  if (error) return jsonError("עדכון נכשל", 400);

  const siteId = await ensurePrimarySite(db);
  await logAudit(db, {
    site_id: siteId, actor_id: session.authId, actor_email: session.email,
    action: "team.set_role", entity_type: "user", entity_id: id, diff: { admin_role },
  });
  return NextResponse.json({ ok: true });
}
