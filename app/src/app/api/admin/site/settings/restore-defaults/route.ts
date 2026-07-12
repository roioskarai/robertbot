import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite } from "@/lib/site/admin";
import { logAdminAudit } from "@/lib/admin-audit";
import { DEFAULT_SETTINGS } from "@/lib/site/defaults";
import type { SiteSettingsDoc } from "@/lib/site/types";

// POST /api/admin/site/settings/restore-defaults
// Resets the settings DRAFT to the code-defined DEFAULT_SETTINGS. Custom-code
// fields are preserved so a settings reset never silently wipes injected code.
// Draft only — the admin still has to publish for it to go live.
export async function POST() {
  const session = await requirePermission("settings.write");
  if (!session) return unauthorized();
  if (isDemoMode()) return jsonError("לא זמין במצב דמו", 400);

  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data: row } = await db
    .from("site_settings").select("draft_doc").eq("site_id", siteId).single();
  const current = (row?.draft_doc as SiteSettingsDoc) ?? DEFAULT_SETTINGS;

  const restored: SiteSettingsDoc = {
    ...DEFAULT_SETTINGS,
    customCss: current.customCss ?? DEFAULT_SETTINGS.customCss,
    customJs: current.customJs ?? DEFAULT_SETTINGS.customJs,
    headerScripts: current.headerScripts ?? DEFAULT_SETTINGS.headerScripts,
    footerScripts: current.footerScripts ?? DEFAULT_SETTINGS.footerScripts,
  };

  const { error } = await db.from("site_settings").update({ draft_doc: restored }).eq("site_id", siteId);
  if (error) return jsonError("שחזור נכשל", 500);

  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: "site.restore_defaults",
    target_type: "site_settings",
    target_id: "settings",
    target_label: "הגדרות האתר",
  });

  return NextResponse.json({ ok: true, draft: restored });
}
