import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";
import { revalidateSite } from "@/lib/site/content";
import { validateCustomCode } from "@/lib/site/sanitize";
import { DEFAULT_SETTINGS } from "@/lib/site/defaults";
import type { SiteSettingsDoc } from "@/lib/site/types";

const CODE_FIELDS = ["customCss", "customJs", "headerScripts", "footerScripts"] as const;

// GET → { draft, published, active_theme_id }
export async function GET() {
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "content.read"))
    return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data } = await db
    .from("site_settings").select("draft_doc, published_doc, active_theme_id").eq("site_id", siteId).single();
  return NextResponse.json({
    draft: data?.draft_doc ?? DEFAULT_SETTINGS,
    published: data?.published_doc ?? DEFAULT_SETTINGS,
    active_theme_id: data?.active_theme_id ?? null,
  });
}

// PUT → save draft. Code fields require code.write; otherwise they are preserved.
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "settings.write"))
    return unauthorized();

  const body = await req.json().catch(() => ({}));
  const incoming = body.draft_doc as Partial<SiteSettingsDoc> | undefined;
  if (!incoming || typeof incoming !== "object") return jsonError("מבנה לא תקין", 400);

  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data: row } = await db
    .from("site_settings").select("draft_doc").eq("site_id", siteId).single();
  const current = (row?.draft_doc as SiteSettingsDoc) ?? DEFAULT_SETTINGS;

  const canEditCode = hasPermission(session.profile.admin_role, "code.write");
  const merged: SiteSettingsDoc = { ...current, ...incoming };

  for (const f of CODE_FIELDS) {
    if (!canEditCode) {
      merged[f] = current[f]; // preserve — no permission to change code
    } else if (incoming[f] !== undefined) {
      const kind = f === "customCss" ? "css" : f === "customJs" ? "js" : "js";
      const err = validateCustomCode(String(incoming[f] ?? ""), kind);
      if (err) return jsonError(err, 400);
    }
  }

  const { error } = await db.from("site_settings").update({ draft_doc: merged }).eq("site_id", siteId);
  if (error) return jsonError("שמירה נכשלה", 400);

  await logAudit(db, {
    site_id: siteId, actor_id: session.authId, actor_email: session.email,
    action: "settings.save_draft",
  });
  return NextResponse.json({ ok: true, draft: merged });
}

// POST → publish settings (draft → published) + revalidate.
export async function POST() {
  const session = await requireAdmin();
  if (!session || !hasPermission(session.profile.admin_role, "settings.write"))
    return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data: row } = await db
    .from("site_settings").select("draft_doc").eq("site_id", siteId).single();
  await db.from("site_settings").update({ published_doc: row?.draft_doc ?? DEFAULT_SETTINGS }).eq("site_id", siteId);
  revalidateSite();
  await logAudit(db, {
    site_id: siteId, actor_id: session.authId, actor_email: session.email,
    action: "settings.publish",
  });
  return NextResponse.json({ ok: true });
}
