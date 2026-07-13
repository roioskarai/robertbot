import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAudit } from "@/lib/admin-audit";

const VALID_REASONS = ["price", "use", "hard", "missing", "competitor", "other"];

// POST /api/billing/feedback  { reason, text }
// Captures cancellation-flow feedback. Persists to the admin audit trail
// (admin_audit_log) via service role so it's queryable in the admin panel —
// no new table/migration required. Never blocks the customer's flow.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!rateLimit(`feedback:${session.authId}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי בקשות בזמן קצר. נסה שוב בעוד דקה.", 429);
  }

  let body: { reason?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const reason = VALID_REASONS.includes(body.reason ?? "") ? body.reason! : "other";
  const text = (body.text ?? "").toString().trim().slice(0, 2000);

  await logAdminAudit(createAdminClient(), {
    actor_id: session.authId,
    actor_email: session.email,
    action: "feedback.cancellation",
    target_type: "user",
    target_id: session.authId,
    target_label: session.email,
    meta: { reason, text },
  });

  return NextResponse.json({ ok: true });
}
