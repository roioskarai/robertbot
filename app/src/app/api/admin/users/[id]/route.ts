import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseBody, adminUserPatchSchema } from "@/lib/schemas";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAdminAudit, diffOf } from "@/lib/admin-audit";

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

/** Pick the most specific audit action for a user patch. */
function auditAction(before: Record<string, unknown>, patch: Record<string, unknown>): string {
  if (patch.is_comp === true && before.is_comp !== true) return "subscription.comp_grant";
  if (patch.is_comp === false && before.is_comp === true) return "subscription.comp_revoke";
  if (typeof patch.is_suspended === "boolean" && patch.is_suspended !== before.is_suspended)
    return patch.is_suspended ? "user.suspend" : "user.unsuspend";
  if (typeof patch.role === "string" && patch.role !== before.role) return "user.role_change";
  const subKeys = ["plan", "subscription_status", "subscription_ends_at", "trial_ends_at", "cancel_at_period_end", "pack_balance"];
  if (subKeys.some((k) => k in patch)) return "subscription.change";
  return "user.update";
}

// PATCH /api/admin/users/[id] — update plan / status / role / suspend / pack / comp.
export async function PATCH(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  if (!rateLimit(`admin-mutate:${clientKey(req)}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי פעולות. נסה שוב בעוד דקה.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(adminUserPatchSchema, body);
  if (!parsed.ok) return jsonError(parsed.message);
  const { _note, ...patch } = parsed.data;

  const db = createAdminClient();
  const { data: before } = await db.from("users").select("*").eq("id", params.id).maybeSingle();
  if (!before) return jsonError("המשתמש לא נמצא", 404);

  const { data, error } = await db.from("users").update(patch).eq("id", params.id).select("*").single();
  if (error) return jsonError(error.message, 500);

  // Suspending a user disables their bots.
  if (patch.is_suspended === true) {
    await db.from("bots").update({ active: false }).eq("user_id", params.id);
  }

  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: auditAction(before as Record<string, unknown>, patch),
    target_type: "user",
    target_id: params.id,
    target_label: (before as { email?: string }).email,
    diff: diffOf(before as Record<string, unknown>, data as Record<string, unknown>, Object.keys(patch)),
    meta: { note: _note ?? null, ip: clientKey(req) },
  });

  const { totp_secret: _o, ...safe } = data as Record<string, unknown>;
  void _o;
  return NextResponse.json({ ok: true, user: safe });
}
