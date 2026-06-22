import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite } from "@/lib/site/admin";

// Blog taxonomy: categories + authors in one endpoint.
// GET    → { categories, authors }
// POST   → { type:'category'|'author', ... }
// DELETE → ?type=category|author&id=

export async function GET() {
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const [{ data: categories }, { data: authors }] = await Promise.all([
    db.from("blog_categories").select("*").eq("site_id", siteId).order("name"),
    db.from("authors").select("*").eq("site_id", siteId).order("name"),
  ]);
  return NextResponse.json({ categories: categories ?? [], authors: authors ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);

  if (body.type === "category") {
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("נדרש שם", 400);
    const slug = (String(body.slug ?? name)).trim().toLowerCase().replace(/[^a-z0-9\-]/g, "-");
    const { data, error } = await db
      .from("blog_categories").insert({ site_id: siteId, name, slug }).select("*").single();
    if (error) return jsonError(error.message.includes("duplicate") ? "קטגוריה קיימת" : error.message, 400);
    return NextResponse.json({ category: data });
  }

  if (body.type === "author") {
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("נדרש שם", 400);
    const { data, error } = await db
      .from("authors")
      .insert({ site_id: siteId, name, bio: body.bio ?? null, avatar_url: body.avatar_url ?? null })
      .select("*").single();
    if (error) return jsonError("יצירה נכשלה", 400);
    return NextResponse.json({ author: data });
  }

  return jsonError("סוג לא תקין", 400);
}

export async function DELETE(req: NextRequest) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");
  if (!id || !type) return jsonError("חסרים פרמטרים", 400);
  const table = type === "category" ? "blog_categories" : type === "author" ? "authors" : null;
  if (!table) return jsonError("סוג לא תקין", 400);
  const db = createAdminClient();
  await db.from(table).delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
