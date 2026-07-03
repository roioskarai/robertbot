import "server-only";

// Public-render data layer for the Website Builder.
//
// • Reads PUBLISHED content via the service-role client, wrapped in unstable_cache
//   (tag SITE_TAG) so the live site is fast and updates instantly on publish
//   (publish calls revalidateSite()).
// • Falls back to src/lib/site/defaults.ts when Supabase isn't configured
//   (demo mode) or the DB hasn't been seeded — so the site is never blank and
//   looks identical to the pre-builder version.
// • Draft reads bypass the cache (used by Next.js Draft Mode preview).

import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import {
  DEFAULT_HOME_DOC,
  DEFAULT_HOME_META,
  DEFAULT_SETTINGS,
  DEFAULT_THEME,
  PRIMARY_DOMAIN,
} from "./defaults";
import type {
  PageDoc,
  PageMeta,
  ResolvedSite,
  Site,
  SiteBanner,
  SiteSettingsDoc,
  ThemeTokens,
} from "./types";

export const SITE_TAG = "site";

const DEMO_SITE: Site = {
  id: "00000000-0000-0000-0000-000000000000",
  domain: PRIMARY_DOMAIN,
  name: "Robert",
  is_primary: true,
};

function demoResolved(): ResolvedSite {
  return { site: DEMO_SITE, theme: DEFAULT_THEME, settings: DEFAULT_SETTINGS };
}

/** Merge a stored (possibly partial) settings doc over the defaults. */
function mergeSettings(stored: Partial<SiteSettingsDoc> | null | undefined): SiteSettingsDoc {
  if (!stored) return DEFAULT_SETTINGS;
  return {
    header: { ...DEFAULT_SETTINGS.header, ...(stored.header ?? {}) },
    footer: { ...DEFAULT_SETTINGS.footer, ...(stored.footer ?? {}) },
    announcement: { ...DEFAULT_SETTINGS.announcement, ...(stored.announcement ?? {}) },
    seo: { ...DEFAULT_SETTINGS.seo, ...(stored.seo ?? {}) },
    whatsappWidget: { ...DEFAULT_SETTINGS.whatsappWidget, ...(stored.whatsappWidget ?? {}) },
    customCss: stored.customCss ?? DEFAULT_SETTINGS.customCss,
    customJs: stored.customJs ?? DEFAULT_SETTINGS.customJs,
    headerScripts: stored.headerScripts ?? DEFAULT_SETTINGS.headerScripts,
    footerScripts: stored.footerScripts ?? DEFAULT_SETTINGS.footerScripts,
  };
}

/** The primary site row id, or null in demo / unseeded. For admin routes. */
export async function getPrimarySiteId(): Promise<string | null> {
  if (isDemoMode()) return null;
  const db = createAdminClient();
  const { data } = await db.from("sites").select("id").eq("is_primary", true).maybeSingle();
  return data?.id ?? null;
}

async function loadResolvedSite(): Promise<ResolvedSite> {
  if (isDemoMode()) return demoResolved();
  try {
    const db = createAdminClient();
    const { data: site } = await db
      .from("sites").select("id, domain, name, is_primary")
      .eq("is_primary", true).maybeSingle();
    if (!site) return demoResolved();

    const [{ data: settings }, { data: theme }] = await Promise.all([
      db.from("site_settings").select("published_doc").eq("site_id", site.id).maybeSingle(),
      db.from("themes").select("tokens").eq("site_id", site.id).eq("is_active", true).maybeSingle(),
    ]);

    return {
      site: site as Site,
      theme: (theme?.tokens as ThemeTokens) ?? DEFAULT_THEME,
      settings: mergeSettings(settings?.published_doc as Partial<SiteSettingsDoc>),
    };
  } catch {
    return demoResolved();
  }
}

const cachedResolvedSite = unstable_cache(loadResolvedSite, ["resolved-site"], {
  tags: [SITE_TAG],
});

/** Resolved site (theme + published settings) for the public renderer. */
export async function getResolvedSite(): Promise<ResolvedSite> {
  return cachedResolvedSite();
}

interface RenderPage {
  id: string | null;
  title: string;
  doc: PageDoc;
  meta: PageMeta;
}

function demoPage(slug: string): RenderPage | null {
  if (slug === "home") {
    return { id: null, title: "Robert", doc: DEFAULT_HOME_DOC, meta: DEFAULT_HOME_META };
  }
  return null;
}

async function loadPublishedPage(slug: string): Promise<RenderPage | null> {
  if (isDemoMode()) return demoPage(slug);
  try {
    const db = createAdminClient();
    const { data: site } = await db
      .from("sites").select("id").eq("is_primary", true).maybeSingle();
    if (!site) return demoPage(slug);
    const { data } = await db
      .from("pages")
      .select("id, title, published_doc, meta, status")
      .eq("site_id", site.id).eq("slug", slug).maybeSingle();
    if (!data || data.status !== "published") return demoPage(slug);
    return {
      id: data.id,
      title: data.title,
      doc: (data.published_doc as PageDoc) ?? { sections: [] },
      meta: (data.meta as PageMeta) ?? {},
    };
  } catch {
    return demoPage(slug);
  }
}

const cachedPublishedPage = unstable_cache(loadPublishedPage, ["published-page"], {
  tags: [SITE_TAG],
});

/** Draft read (bypasses cache) — used by Draft Mode preview. */
async function loadDraftPage(slug: string): Promise<RenderPage | null> {
  if (isDemoMode()) return demoPage(slug);
  try {
    const db = createAdminClient();
    const { data: site } = await db
      .from("sites").select("id").eq("is_primary", true).maybeSingle();
    if (!site) return demoPage(slug);
    const { data } = await db
      .from("pages")
      .select("id, title, draft_doc, meta")
      .eq("site_id", site.id).eq("slug", slug).maybeSingle();
    if (!data) return demoPage(slug);
    return {
      id: data.id,
      title: data.title,
      doc: (data.draft_doc as PageDoc) ?? { sections: [] },
      meta: (data.meta as PageMeta) ?? {},
    };
  } catch {
    return demoPage(slug);
  }
}

/** The page to render for a slug. Pass { draft } for live preview. */
export async function getRenderPage(
  slug: string,
  opts?: { draft?: boolean },
): Promise<RenderPage | null> {
  return opts?.draft ? loadDraftPage(slug) : cachedPublishedPage(slug);
}

async function loadActiveBanners(): Promise<SiteBanner[]> {
  if (isDemoMode()) return [];
  try {
    const db = createAdminClient();
    const { data: site } = await db.from("sites").select("id").eq("is_primary", true).maybeSingle();
    if (!site) return [];
    const { data } = await db
      .from("banners").select("*").eq("site_id", site.id).eq("status", "published");
    const now = Date.now();
    return ((data as SiteBanner[]) ?? []).filter((b) => {
      if (b.schedule_start && now < new Date(b.schedule_start).getTime()) return false;
      if (b.schedule_end && now > new Date(b.schedule_end).getTime()) return false;
      return true;
    });
  } catch {
    return [];
  }
}

const cachedActiveBanners = unstable_cache(loadActiveBanners, ["active-banners"], {
  tags: [SITE_TAG],
});

/** Published, in-schedule banners/popups for public rendering. */
export async function getActiveBanners(): Promise<SiteBanner[]> {
  return cachedActiveBanners();
}

/** Invalidate all cached public content after a publish. */
export function revalidateSite(): void {
  // Next 16: revalidateTag requires a cache-life profile; "max" = the old
  // stale-while-revalidate behavior (entries marked stale, refetched on demand).
  revalidateTag(SITE_TAG, "max");
}
