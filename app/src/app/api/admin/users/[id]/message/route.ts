import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAdminAudit } from "@/lib/admin-audit";
import { parseBody, adminUserMessageSchema } from "@/lib/schemas";
import { hasResendKey, sendEmail, adminMessageEmail } from "@/lib/resend";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/users/[id]/message — admin sends a free-text email to a user.
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  if (!rateLimit(`admin-mutate:${clientKey(req)}`, 30, 60_000).allowed) {
    return jsonError("יותר מדי פעולות. נסה שוב בעוד דקה.", 429);
  }
  if (!hasResendKey()) return jsonError("שליחת מיילים אינה מוגדרת (חסר מפתח Resend)", 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(adminUserMessageSchema, body);
  if (!parsed.ok) return jsonError(parsed.message);

  const db = createAdminClient();
  const { data: user } = await db.from("users").select("email, full_name").eq("id", params.id).maybeSingle();
  if (!user?.email) return jsonError("המשתמש לא נמצא", 404);

  try {
    const tpl = adminMessageEmail({ name: user.full_name || user.email, subject: parsed.data.subject, body: parsed.data.body });
    await sendEmail(user.email, tpl.subject, tpl.html);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "שליחת המייל נכשלה", 500);
  }

  // Never log the message body — only the subject, mirroring feedback.cancellation.
  await logAdminAudit(db, {
    actor_id: session.authId,
    actor_email: session.email,
    action: "user.message_sent",
    target_type: "user",
    target_id: params.id,
    target_label: user.email,
    meta: { subject: parsed.data.subject, ip: clientKey(req) },
  });

  return NextResponse.json({ ok: true });
}
