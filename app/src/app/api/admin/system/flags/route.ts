import { NextResponse } from "next/server";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseBody, featureFlagSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAudit } from "@/lib/admin-audit";
import { setFlagOverrides } from "@/lib/system-settings";
import { flagStates, isKnownFlag } from "@/lib/feature-flags";

// GET /api/admin/system/flags → every registry flag with its effective state
export async function GET() {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  const flags = await flagStates();
  return NextResponse.json({ flags }, { headers: { "Cache-Control": "no-store" } });
}

// POST /api/admin/system/flags  { key, enabled } — toggle ONE known flag
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(featureFlagSchema, body);
  if (!parsed.ok) return jsonError(parsed.message);
  if (!isKnownFlag(parsed.data.key)) return jsonError("דגל לא מוכר", 400);

  const res = await setFlagOverrides({ [parsed.data.key]: parsed.data.enabled }, session.email);
  if (!res.ok) return jsonError(res.error, res.missingTable ? 409 : 500);

  await logAdminAudit(createAdminClient(), {
    actor_id: session.authId,
    actor_email: session.email,
    action: "system.flag_toggle",
    target_type: "feature_flag",
    target_id: parsed.data.key,
    target_label: parsed.data.key,
    meta: { enabled: parsed.data.enabled },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
