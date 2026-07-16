import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";
import { resolveBotSegment } from "@/lib/admin-users-query";

// GET /api/admin/insights — read-only diagnostics for the WhatsApp connection
// funnel: recent connection failures (Twilio code + Hebrew reason) and the
// actionable "created a bot, never connected a number" segment. Degrades
// gracefully before migration 0015 (the events table simply returns nothing).
export async function GET() {
  if (!(await requireAdmin())) return jsonError("אין הרשאת אדמין", 403);
  const db = createAdminClient();

  // Recent connection errors — best-effort; empty array if the table is absent.
  let recentErrors: Record<string, unknown>[] = [];
  try {
    const { data } = await db
      .from("wa_connection_events")
      .select("id, scope, twilio_code, kind, phone_masked, message_he, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    recentErrors = data ?? [];
  } catch {
    /* table not migrated yet */
  }

  // Users who created ≥1 bot but connected none of them.
  const noNumberIds = (await resolveBotSegment(db, "bot_no_number")) ?? [];
  const noBotIds = (await resolveBotSegment(db, "no_bot")) ?? [];

  let botNoNumberUsers: Record<string, unknown>[] = [];
  if (noNumberIds.length) {
    const { data } = await db
      .from("users")
      .select("id, email, full_name, plan, subscription_status, created_at")
      .in("id", noNumberIds.slice(0, 200))
      .order("created_at", { ascending: false });
    botNoNumberUsers = data ?? [];
  }

  return NextResponse.json({
    recentErrors,
    botNoNumberUsers,
    counts: { botNoNumber: noNumberIds.length, noBot: noBotIds.length },
  });
}
