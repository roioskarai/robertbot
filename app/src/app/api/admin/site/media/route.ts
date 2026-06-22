import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { jsonError, unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";
import { ensurePrimarySite, logAudit } from "@/lib/site/admin";

const BUCKET = "site-media";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = /^(image\/(png|jpe?g|gif|webp|svg\+xml)|video\/(mp4|webm))$/;

// GET → list media (optional ?q= search, ?folder=)
export async function GET(req: NextRequest) {
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const folder = url.searchParams.get("folder");

  let query = db.from("media").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
  if (folder) query = query.eq("folder", folder);
  if (q) query = query.ilike("alt", `%${q}%`);
  const { data } = await query.limit(300);
  return NextResponse.json({ media: data ?? [] });
}

// POST → upload (multipart: file, alt?, folder?, tags?)
export async function POST(req: NextRequest) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  if (isDemoMode()) return jsonError("העלאה אינה זמינה במצב דמו", 400);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("לא נבחר קובץ", 400);
  if (file.size > MAX_BYTES) return jsonError("הקובץ גדול מדי (מקסימום 10MB)", 400);
  if (!ALLOWED.test(file.type)) return jsonError("סוג קובץ לא נתמך", 400);

  const db = createAdminClient();
  const siteId = await ensurePrimarySite(db);
  const folder = String(form.get("folder") ?? "").replace(/[^a-zA-Z0-9_-]/g, "") || "general";
  const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${siteId}/${folder}/${Date.now()}-${safeName}`;

  const buf = await file.arrayBuffer();
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return jsonError("ההעלאה נכשלה: " + upErr.message, 500);

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
  const { data, error } = await db
    .from("media")
    .insert({
      site_id: siteId,
      path,
      url: pub.publicUrl,
      mime: file.type,
      size: file.size,
      alt: String(form.get("alt") ?? "") || null,
      folder,
      tags: [],
      created_by: session.authId,
    })
    .select("*").single();
  if (error) return jsonError("שמירת הרשומה נכשלה", 500);

  await logAudit(db, {
    site_id: siteId, actor_id: session.authId, actor_email: session.email,
    action: "media.upload", entity_type: "media", entity_id: data.id,
  });
  return NextResponse.json({ media: data });
}

// DELETE ?id= → remove from storage + table
export async function DELETE(req: NextRequest) {
  const session = await requirePermission("content.write");
  if (!session) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("נדרש מזהה", 400);

  const db = createAdminClient();
  const { data: row } = await db.from("media").select("path, site_id").eq("id", id).single();
  if (!row) return jsonError("לא נמצא", 404);
  await db.storage.from(BUCKET).remove([row.path]);
  await db.from("media").delete().eq("id", id);
  await logAudit(db, {
    site_id: row.site_id, actor_id: session.authId, actor_email: session.email,
    action: "media.delete", entity_type: "media", entity_id: id,
  });
  return NextResponse.json({ ok: true });
}
