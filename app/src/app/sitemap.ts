import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";

const BASE = "https://robertbot.co.il";

// Reserved app-route slugs that must never be emitted as CMS URLs.
const RESERVED = new Set(["pricing", "templates", "legal", "login", "onboarding"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = ["", "/pricing", "/templates", "/legal"].map(
    (p) => ({
      url: `${BASE}${p}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: p === "" ? 1 : 0.7,
    }),
  );

  if (isDemoMode()) return staticRoutes;

  // Published CMS pages ([slug]) — best-effort; the static set always ships.
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("pages")
      .select("slug, kind, status, updated_at")
      .eq("status", "published");
    const cms: MetadataRoute.Sitemap = (data ?? [])
      .filter((p) => p.kind !== "home" && p.slug && !RESERVED.has(p.slug))
      .map((p) => ({
        url: `${BASE}/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      }));
    return [...staticRoutes, ...cms];
  } catch {
    return staticRoutes;
  }
}
