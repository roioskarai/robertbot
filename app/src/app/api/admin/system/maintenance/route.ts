import { NextResponse } from "next/server";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { parseBody, maintenanceSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAudit } from "@/lib/admin-audit";
import { getMaintenance, setMaintenance } from "@/lib/system-settings";

// GET /api/admin/system/maintenance → current state
export async function GET() {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);
  const state = await getMaintenance();
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}

// POST /api/admin/system/maintenance  { enabled, message?, etaText? }
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = parseBody(maintenanceSchema, body);
  if (!parsed.ok) return jsonError(parsed.message);

  const before = await getMaintenance();
  const res = await setMaintenance(parsed.data, session.email);
  if (!res.ok) return jsonError(res.error, res.missingTable ? 409 : 500);

  await logAdminAudit(createAdminClient(), {
    actor_id: session.authId,
    actor_email: session.email,
    action: parsed.data.enabled ? "system.maintenance_on" : "system.maintenance_off",
    target_type: "system",
    target_id: "maintenance",
    target_label: "מצב תחזוקה",
    diff: {
      before: { enabled: before.enabled },
      after: { enabled: parsed.data.enabled, message: parsed.data.message ?? "", etaText: parsed.data.etaText ?? "" },
    },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
