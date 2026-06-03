import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasResendKey, sendEmail, trialEndingEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

// GET /api/cron/trial?secret=...
// Run daily (Vercel Cron). Sends the day-5 reminder and deactivates bots
// for trials that have ended without payment.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const in2days = new Date(now + 2 * 86_400_000).toISOString();
  const nowIso = new Date(now).toISOString();

  let reminders = 0;
  let deactivated = 0;

  // Day-5 reminder: still on trial, ends within 2 days, not yet reminded.
  const { data: ending } = await supabase
    .from("users")
    .select("id, email, full_name, trial_ends_at, trial_reminder_sent")
    .eq("subscription_status", "trial")
    .lte("trial_ends_at", in2days)
    .gte("trial_ends_at", nowIso)
    .or("trial_reminder_sent.is.null,trial_reminder_sent.eq.false");

  for (const u of ending ?? []) {
    if (hasResendKey() && u.email) {
      try {
        const { subject, html } = trialEndingEmail({
          name: u.full_name || "",
          trialEndsAt: new Date(u.trial_ends_at).toLocaleDateString("he-IL"),
        });
        await sendEmail(u.email, subject, html);
      } catch {
        /* ignore */
      }
    }
    await supabase.from("users").update({ trial_reminder_sent: true }).eq("id", u.id);
    reminders++;
  }

  // Trial ended without payment: deactivate the user's bots.
  const { data: expired } = await supabase
    .from("users")
    .select("id")
    .eq("subscription_status", "trial")
    .lt("trial_ends_at", nowIso);

  for (const u of expired ?? []) {
    const { count } = await supabase
      .from("bots")
      .update({ active: false }, { count: "exact" })
      .eq("user_id", u.id)
      .eq("active", true);
    deactivated += count ?? 0;
  }

  return NextResponse.json({ ok: true, reminders, deactivated });
}
