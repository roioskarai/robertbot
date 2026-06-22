import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";
import { revalidateSite } from "@/lib/site/content";
import {
  DEFAULT_HOME_DOC,
  DEFAULT_HOME_META,
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
} from "@/lib/site/defaults";

// Provision the site from defaults.ts (single source of truth). Also used for
// "restore defaults" with ?force=1 (overwrites the home page + settings).
export async function POST(req: NextRequest) {
  const session = await requirePermission("backup.manage");
  if (!session) return unauthorized();
  if (isDemoMode()) return jsonError("פעולה זו אינה זמינה במצב דמו", 400);

  const force = new URL(req.url).searchParams.get("force") === "1";
  const db = createAdminClient();

  try {
    const siteId = await ensurePrimarySite(db);

    // Settings (only overwrite published on force; always keep a draft).
    if (force) {
      await db.from("site_settings").upsert({
        site_id: siteId,
        draft_doc: DEFAULT_SETTINGS,
        published_doc: DEFAULT_SETTINGS,
      });
    }

    // Default theme.
    const { data: theme } = await db
      .from("themes").select("id").eq("site_id", siteId).eq("is_default", true).maybeSingle();
    let themeId = theme?.id as string | undefined;
    if (!themeId) {
      const { data: created } = await db
        .from("themes")
        .insert({ site_id: siteId, name: "ברירת מחדל", tokens: DEFAULT_THEME, is_active: true, is_default: true })
        .select("id").single();
      themeId = created?.id;
    } else if (force) {
      await db.from("themes").update({ tokens: DEFAULT_THEME, is_active: true }).eq("id", themeId);
    }
    if (themeId) await db.from("site_settings").update({ active_theme_id: themeId }).eq("site_id", siteId);

    // Home page.
    const { data: home } = await db
      .from("pages").select("id").eq("site_id", siteId).eq("slug", "home").maybeSingle();
    if (!home || force) {
      await db.from("pages").upsert(
        {
          site_id: siteId,
          slug: "home",
          kind: "home",
          title: "דף הבית",
          status: "published",
          meta: DEFAULT_HOME_META,
          draft_doc: DEFAULT_HOME_DOC,
          published_doc: DEFAULT_HOME_DOC,
          published_at: new Date().toISOString(),
        },
        { onConflict: "site_id,slug" },
      );
    }

    revalidateSite();
    await logAudit(db, {
      site_id: siteId,
      actor_id: session.authId,
      actor_email: session.email,
      action: force ? "site.restore_defaults" : "site.seed",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError((e as Error).message || "אתחול נכשל", 500);
  }
}
