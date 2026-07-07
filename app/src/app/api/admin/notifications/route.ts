import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { deriveNotifications } from "@/lib/admin-notifications";

// GET /api/admin/notifications — alerts computed on the fly (no table).
// Trials ending ≤48h, comps expiring ≤7d, agent runs failed in 24h, new users.
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  const [{ data: users }, { data: runs }] = await Promise.all([
    db.from("users").select("id, email, subscription_status, trial_ends_at, is_comp, subscription_ends_at, created_at"),
    db.from("agent_runs").select("id, agent, status, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const notifications = deriveNotifications(users ?? [], runs ?? []);
  return NextResponse.json(
    { notifications },
    { headers: { "Cache-Control": "no-store" } },
  );
}
