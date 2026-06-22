import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";
import { DEFAULT_THEME } from "@/lib/site/defaults";

// GET → all themes for the site
export async function GET() {
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "content.read"))
    return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data } = await db
    .from("themes").select("*").eq("site_id", siteId).order("created_at", { ascending: true });
  return NextResponse.json({ themes: data ?? [] });
}

// POST → create / duplicate / import a theme { name, tokens }
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "design.write"))
    return unauthorized();
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim() || "ערכת נושא חדשה";
  const tokens = body.tokens && typeof body.tokens === "object" ? body.tokens : DEFAULT_THEME;

  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data, error } = await db
    .from("themes")
    .insert({ site_id: siteId, name, tokens, is_active: false, is_default: false })
    .select("*").single();
  if (error) return jsonError("יצירה נכשלה", 400);

  await logAudit(db, {
    site_id: siteId, actor_id: session.authId, actor_email: session.email,
    action: "theme.create", entity_type: "theme", entity_id: data.id,
  });
  return NextResponse.json({ theme: data });
}
