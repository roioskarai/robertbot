import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/bots — all bots across tenants, with owner email.
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const { data: bots, error } = await db
    .from("bots")
    .select("id, user_id, name, bot_name, business_type, active, whatsapp_number, wa_provider, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return jsonError(error.message, 500);

  const { data: users } = await db.from("users").select("id, email");
  const emailById = new Map((users ?? []).map((u) => [u.id, u.email]));

  return NextResponse.json({
    bots: (bots ?? []).map((b) => ({ ...b, owner_email: emailById.get(b.user_id) ?? null })),
  });
}
