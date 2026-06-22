import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";

// GET  → list pages (id, slug, kind, title, status, dates)
export async function GET() {
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data } = await db
    .from("pages")
    .select("id, slug, kind, title, status, updated_at, published_at, scheduled_at, category_id, author_id")
    .eq("site_id", siteId)
    .order("kind", { ascending: true })
    .order("updated_at", { ascending: false });
  return NextResponse.json({ pages: data ?? [] });
}

// POST → create a new page/post { slug, kind, title }
export async function POST(req: NextRequest) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9\-]/g, "-");
  const kind = ["home", "page", "post"].includes(body.kind) ? body.kind : "page";
  const title = String(body.title ?? "").trim() || "ללא כותרת";
  if (!slug) return jsonError("נדרש slug תקין", 400);

  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const { data, error } = await db
    .from("pages")
    .insert({ site_id: siteId, slug, kind, title, status: "draft" })
    .select("id, slug, kind, title, status")
    .single();
  if (error) return jsonError(error.message.includes("duplicate") ? "כתובת (slug) כבר קיימת" : error.message, 400);

  await logAudit(db, {
    site_id: siteId, actor_id: session.authId, actor_email: session.email,
    action: "page.create", entity_type: "page", entity_id: data.id,
  });
  return NextResponse.json({ page: data });
}
