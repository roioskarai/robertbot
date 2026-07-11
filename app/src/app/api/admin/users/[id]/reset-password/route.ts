import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAdminAudit } from "@/lib/admin-audit";
import { hasResendKey, sendEmail, passwordResetEmail } from "@/lib/resend";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/users/[id]/reset-password — admin-initiated recovery.
// Generates a Supabase recovery link (never sets or reveals a password).
// With Resend configured the link is emailed to the user; otherwise the link
// is returned so the admin can hand it over manually.
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  if (!rateLimit(`admin-mutate:${clientKey(req)}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי פעולות. נסה שוב בעוד דקה.", 429);
  }

  const db = createAdminClient();
  const { data: user } = await db.from("users").select("email, full_name").eq("id", params.id).maybeSingle();
  if (!user?.email) return jsonError("המשתמש לא נמצא", 404);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || new URL(req.url).origin;
  const { data, error } = await db.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/reset-password` },
  });
  if (error || !data?.properties?.action_link) {
    return jsonError(error?.message ?? "יצירת קישור האיפוס נכשלה", 500);
  }
  const link = data.properties.action_link;

  let emailed = false;
  if (hasResendKey()) {
    try {
      const tpl = passwordResetEmail({ name: user.full_name || user.email, link });
      await sendEmail(user.email, tpl.subject, tpl.html);
      emailed = true;
    } catch (e) {
      console.error("[admin-reset-password] email failed:", e instanceof Error ? e.message : e);
    }
  }

  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: "user.password_reset_sent",
    target_type: "user",
    target_id: params.id,
    target_label: user.email,
    meta: { emailed, ip: clientKey(req) },
  });

  // When the email couldn't be sent, hand the link to the admin (over the
  // authenticated admin session only) so the user isn't stuck.
  return NextResponse.json(emailed ? { ok: true, emailed } : { ok: true, emailed, link });
}
