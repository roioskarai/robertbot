import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseBody, adminUserPatchSchema, adminUserDeleteSchema } from "@/lib/schemas";
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
  // wa_connection_status/wa_last_error land with migration 0014 — select them
  // best-effort and fall back to the base columns so this route keeps working
  // before the migration is applied (mirrors the decoupled write pattern).
  let bots: Record<string, unknown>[] | null = null;
  ({ data: bots } = await db
    .from("bots")
    .select("id, name, bot_name, active, whatsapp_number, wa_provider, wa_connection_status, wa_last_error, created_at")
    .eq("user_id", params.id));
  if (!bots) {
    ({ data: bots } = await db
      .from("bots")
      .select("id, name, bot_name, active, whatsapp_number, wa_provider, created_at")
      .eq("user_id", params.id));
  }
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
  if (typeof patch.email === "string" && patch.email !== before.email) return "user.email_change";
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

  // Email changes go to auth.users FIRST (service-role, no re-confirm mail);
  // only then to the profile row, so the two can't drift apart silently.
  const emailChanged = typeof patch.email === "string" && patch.email !== (before as { email?: string }).email;
  if (emailChanged) {
    const { error: authErr } = await db.auth.admin.updateUserById(params.id, {
      email: patch.email,
      email_confirm: true,
    });
    if (authErr) {
      const dup = /already|exists|registered/i.test(authErr.message);
      return jsonError(dup ? "האימייל כבר בשימוש" : authErr.message, dup ? 409 : 500);
    }
  }

  const { data, error } = await db.from("users").update(patch).eq("id", params.id).select("*").single();
  if (error) {
    // Roll the auth email back so auth.users and users never disagree.
    if (emailChanged) {
      await db.auth.admin.updateUserById(params.id, {
        email: (before as { email: string }).email,
        email_confirm: true,
      }).then(({ error: rb }) => {
        if (rb) console.error("[admin-users] email rollback failed:", rb.message);
      });
    }
    const dup = error.code === "23505";
    return jsonError(dup ? "האימייל כבר בשימוש" : error.message, dup ? 409 : 500);
  }

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

// DELETE /api/admin/users/[id]  { confirmEmail } — permanently delete a user.
// Deleting the auth user cascades: auth.users → users → bots → conversations →
// messages → agent_runs. usage_logs is removed explicitly (its FK gains
// CASCADE only in migration 0011). payment_events rows are kept (ledger).
export async function DELETE(req: Request, props: Ctx) {
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
  const parsed = parseBody(adminUserDeleteSchema, body);
  if (!parsed.ok) return jsonError(parsed.message);

  const db = createAdminClient();
  const { data: user } = await db.from("users").select("*").eq("id", params.id).maybeSingle();
  if (!user) return jsonError("המשתמש לא נמצא", 404);

  if (params.id === session.authId) return jsonError("אי אפשר למחוק את החשבון של עצמך", 400);
  if ((user as { role?: string }).role === "admin") {
    return jsonError("אי אפשר למחוק חשבון אדמין — הסר קודם את תפקיד האדמין", 400);
  }
  if (parsed.data.confirmEmail.toLowerCase() !== String((user as { email?: string }).email ?? "").toLowerCase()) {
    return jsonError("אימות האימייל לא תואם — הקלד את כתובת המשתמש במדויק", 400);
  }

  // Audit FIRST, with a snapshot — the row must exist even after the user is gone.
  const u = user as Record<string, unknown>;
  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: "user.delete",
    target_type: "user",
    target_id: params.id,
    target_label: String(u.email ?? ""),
    diff: {
      before: {
        email: u.email, full_name: u.full_name, plan: u.plan,
        subscription_status: u.subscription_status, is_comp: u.is_comp,
        pack_balance: u.pack_balance, created_at: u.created_at,
      },
      after: {},
    },
    meta: { ip: clientKey(req) },
  });

  // Pre-0011 the usage_logs FK has no CASCADE — clear it explicitly.
  await db.from("usage_logs").delete().eq("user_id", params.id);

  const { error } = await db.auth.admin.deleteUser(params.id);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}
