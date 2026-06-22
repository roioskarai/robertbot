import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite } from "@/lib/site/admin";

interface Ev { type: string; path: string | null; referrer: string | null; session_id: string | null; created_at: string }

// Aggregate the last 30 days of site_events for the dashboard charts.
export async function GET() {
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);

  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await db
    .from("site_events")
    .select("type, path, referrer, session_id, created_at")
    .eq("site_id", siteId)
    .gte("created_at", since)
    .limit(5000);
  const events = (data as Ev[]) ?? [];

  const days: Record<string, { pageviews: number; conversions: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days[d] = { pageviews: 0, conversions: 0 };
  }
  const sessions = new Set<string>();
  const paths: Record<string, number> = {};
  const refs: Record<string, number> = {};
  let pageviews = 0, conversions = 0;

  for (const e of events) {
    const d = e.created_at.slice(0, 10);
    if (e.session_id) sessions.add(e.session_id);
    if (e.type === "pageview") {
      pageviews++;
      if (days[d]) days[d].pageviews++;
      if (e.path) paths[e.path] = (paths[e.path] ?? 0) + 1;
      const ref = e.referrer ? new URL(e.referrer.startsWith("http") ? e.referrer : "http://x").hostname || "ישיר" : "ישיר";
      refs[ref] = (refs[ref] ?? 0) + 1;
    } else if (e.type === "conversion") {
      conversions++;
      if (days[d]) days[d].conversions++;
    }
  }

  const series = Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v }));
  const topPaths = Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count }));
  const topRefs = Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([referrer, count]) => ({ referrer, count }));

  return NextResponse.json({
    totals: {
      pageviews,
      sessions: sessions.size,
      conversions,
      conversionRate: pageviews ? Math.round((conversions / pageviews) * 1000) / 10 : 0,
    },
    series,
    topPaths,
    topRefs,
  });
}
