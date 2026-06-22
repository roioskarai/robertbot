import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";
import { revalidateSite } from "@/lib/site/content";

// GET → export the whole site as one JSON document (settings, themes, pages, banners, taxonomy).
export async function GET() {
  const session = await requirePermission("backup.manage");
  if (!session) return unauthorized();
  if (isDemoMode()) return jsonError("לא זמין במצב דמו", 400);
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);

  const [settings, themes, pages, banners, cats, authors] = await Promise.all([
    db.from("site_settings").select("draft_doc, published_doc, active_theme_id").eq("site_id", siteId).single(),
    db.from("themes").select("name, tokens, is_active, is_default").eq("site_id", siteId),
    db.from("pages").select("slug, kind, title, status, meta, draft_doc, published_doc").eq("site_id", siteId),
    db.from("banners").select("kind, name, config, status, targeting, schedule_start, schedule_end, position").eq("site_id", siteId),
    db.from("blog_categories").select("name, slug").eq("site_id", siteId),
    db.from("authors").select("name, bio, avatar_url").eq("site_id", siteId),
  ]);

  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings.data,
    themes: themes.data ?? [],
    pages: pages.data ?? [],
    banners: banners.data ?? [],
    categories: cats.data ?? [],
    authors: authors.data ?? [],
  });
}

// POST → restore from an exported JSON backup (upsert pages by slug; replace settings/banners).
export async function POST(req: NextRequest) {
  const session = await requirePermission("backup.manage");
  if (!session) return unauthorized();
  if (isDemoMode()) return jsonError("לא זמין במצב דמו", 400);
  const backup = await req.json().catch(() => null);
  if (!backup || backup.version !== 1) return jsonError("קובץ גיבוי לא תקין", 400);

  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);

  try {
    if (backup.settings) {
      await db.from("site_settings").update({
        draft_doc: backup.settings.draft_doc,
        published_doc: backup.settings.published_doc,
      }).eq("site_id", siteId);
    }
    for (const p of backup.pages ?? []) {
      await db.from("pages").upsert({ site_id: siteId, ...p }, { onConflict: "site_id,slug" });
    }
    // Replace banners wholesale.
    if (Array.isArray(backup.banners)) {
      await db.from("banners").delete().eq("site_id", siteId);
      if (backup.banners.length)
        await db.from("banners").insert(backup.banners.map((b: Record<string, unknown>) => ({ site_id: siteId, ...b })));
    }
    for (const cat of backup.categories ?? [])
      await db.from("blog_categories").upsert({ site_id: siteId, ...cat }, { onConflict: "site_id,slug" });

    revalidateSite();
    await logAudit(db, { site_id: siteId, actor_id: session.authId, actor_email: session.email, action: "site.restore_backup" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError((e as Error).message || "שחזור נכשל", 500);
  }
}
