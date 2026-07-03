import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { isPlanId } from "@/lib/plans";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id] — full detail (profile + bots + usage).
export async function GET(_req: Request, props: Ctx) {
  const params = await props.params;
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const { data: user } = await db.from("users").select("*").eq("id", params.id).maybeSingle();
  if (!user) return jsonError("המשתמש לא נמצא", 404);
  const { data: bots } = await db.from("bots").select("id, name, bot_name, active, whatsapp_number, wa_provider, created_at").eq("user_id", params.id);
  const period = new Date().toISOString().slice(0, 7);
  const { data: usage } = await db.from("usage_logs").select("message_count").eq("user_id", params.id).eq("period", period);
  const used = (usage ?? []).reduce((s, r) => s + (r.message_count ?? 0), 0);

  // never leak the encrypted secret
  const { totp_secret: _omit, ...safe } = user as Record<string, unknown>;
  void _omit;
  return NextResponse.json({ user: safe, bots: bots ?? [], usageThisMonth: used });
}

// PATCH /api/admin/users/[id] — update plan / status / role / suspend / pack.
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.plan === "string" && isPlanId(body.plan)) patch.plan = body.plan;
  if (typeof body.subscription_status === "string" &&
      ["trial", "active", "cancelled", "paused"].includes(body.subscription_status))
    patch.subscription_status = body.subscription_status;
  if (typeof body.role === "string" && ["admin", "tenant"].includes(body.role)) patch.role = body.role;
  if (typeof body.is_suspended === "boolean") patch.is_suspended = body.is_suspended;
  if (typeof body.pack_balance === "number" && body.pack_balance >= 0) patch.pack_balance = Math.floor(body.pack_balance);

  if (!Object.keys(patch).length) return jsonError("אין שדות תקינים לעדכון");

  const db = createAdminClient();
  const { data, error } = await db.from("users").update(patch).eq("id", params.id).select("*").single();
  if (error) return jsonError(error.message, 500);

  // Suspending a user disables their bots.
  if (patch.is_suspended === true) {
    await db.from("bots").update({ active: false }).eq("user_id", params.id);
  }

  const { totp_secret: _o, ...safe } = data as Record<string, unknown>;
  void _o;
  return NextResponse.json({ ok: true, user: safe });
}
