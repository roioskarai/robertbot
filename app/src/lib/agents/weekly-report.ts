import { payingMetrics } from "@/lib/admin-metrics";
import { deriveNotifications } from "@/lib/admin-notifications";
import { isMissingTableError } from "@/lib/admin-audit-core";
import { hasAnthropicKey } from "@/lib/claude";
import { hasResendKey, sendEmail, weeklyOwnerReportEmail } from "@/lib/resend";
import type { AgentResult, ProposedAction } from "@/lib/types";
import { isoWeekKey } from "./actions";
import { callClaude, type Agent, type AgentContext } from "./runner";

/**
 * weekly-report — the owner's strategic digest. Runs through the orchestrator
 * every Sunday (or manually from /admin/agents). All numbers are computed in
 * code from the database; Claude only phrases a short Hebrew narrative over
 * them (and is skipped gracefully when no API key is set).
 *
 * Emailing the OWNER is allowed (owner report ≠ customer message) — the
 * draft-only principle is about customers, not the operator.
 */

const WEEK = 7 * 86_400_000;

export interface WeeklyStats {
  signupsThisWeek: number;
  signupsLastWeek: number;
  mrr: number;
  paying: number;
  comps: number;
  paymentsThisWeek: number;
  cancellationsThisWeek: number | null; // null until migration 0011 provides the audit trail
  alerts: string[];
  pendingProposals: number;
  tokensThisWeek: number;
}

export const weeklyReport: Agent = {
  name: "weekly-report",
  async run(ctx: AgentContext): Promise<AgentResult> {
    const now = ctx.now;
    const weekAgo = new Date(now.getTime() - WEEK).toISOString();
    const twoWeeksAgo = new Date(now.getTime() - 2 * WEEK).toISOString();

    const [{ data: users }, { data: runs }, payments, audit] = await Promise.all([
      ctx.supabase
        .from("users")
        .select("id, email, plan, billing_cycle, subscription_status, is_comp, trial_ends_at, subscription_ends_at, created_at, last_login_at, is_suspended"),
      ctx.supabase
        .from("agent_runs")
        .select("id, agent, status, tokens, proposed_actions, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      ctx.supabase
        .from("payment_events")
        .select("event_type, created_at")
        .gte("created_at", weekAgo)
        .limit(500),
      ctx.supabase
        .from("admin_audit_log")
        .select("action, diff, created_at")
        .in("action", ["subscription.change", "subscription.comp_revoke"])
        .gte("created_at", weekAgo)
        .limit(500),
    ]);

    const allUsers = users ?? [];
    const allRuns = runs ?? [];

    let signupsThisWeek = 0;
    let signupsLastWeek = 0;
    for (const u of allUsers) {
      const ts = u.created_at ? Date.parse(u.created_at) : NaN;
      if (Number.isNaN(ts)) continue;
      if (ts >= now.getTime() - WEEK) signupsThisWeek += 1;
      else if (Date.parse(twoWeeksAgo) <= ts) signupsLastWeek += 1;
    }

    const { mrr, paying, comps } = payingMetrics(allUsers);

    const paymentsThisWeek = (payments.data ?? []).filter(
      (p) => p.event_type === "subscription_active" || p.event_type === "pack_purchased",
    ).length;

    // Cancellations from the audit trail (feature-detected until 0011).
    let cancellationsThisWeek: number | null = null;
    if (!audit.error) {
      cancellationsThisWeek = (audit.data ?? []).filter((row) => {
        const after = (row.diff as { after?: Record<string, unknown> } | null)?.after;
        return after?.subscription_status === "cancelled";
      }).length;
    } else if (!isMissingTableError(audit.error)) {
      cancellationsThisWeek = null;
    }

    const alerts = deriveNotifications(allUsers, allRuns, now)
      .slice(0, 5)
      .map((a) => a.title);

    let pendingProposals = 0;
    let tokensThisWeek = 0;
    for (const r of allRuns) {
      const acts = Array.isArray(r.proposed_actions) ? (r.proposed_actions as ProposedAction[]) : [];
      pendingProposals += acts.filter((a) => a.status === "pending").length;
      const ts = r.created_at ? Date.parse(r.created_at) : NaN;
      if (!Number.isNaN(ts) && ts >= now.getTime() - WEEK) tokensThisWeek += r.tokens ?? 0;
    }

    const stats: WeeklyStats = {
      signupsThisWeek, signupsLastWeek, mrr, paying, comps,
      paymentsThisWeek, cancellationsThisWeek, alerts, pendingProposals, tokensThisWeek,
    };

    // Narrative: Claude phrases; numbers stay ours. Graceful without a key.
    let narrative = "";
    let tokens = 0;
    if (hasAnthropicKey()) {
      try {
        const { text, tokens: t } = await callClaude({
          system: NARRATIVE_SYSTEM,
          prompt: narrativePrompt(stats),
          maxTokens: 500,
        });
        narrative = text.trim();
        tokens = t;
      } catch {
        /* narrative is optional — the numbers carry the report */
      }
    }
    if (!narrative) {
      narrative =
        signupsThisWeek >= signupsLastWeek
          ? `שבוע יציב: ${signupsThisWeek} הרשמות (לעומת ${signupsLastWeek} בשבוע שעבר), MRR ₪${mrr.toLocaleString()}.`
          : `ירידה בהרשמות: ${signupsThisWeek} לעומת ${signupsLastWeek} בשבוע שעבר. MRR ₪${mrr.toLocaleString()}.`;
    }

    const week = isoWeekKey(now);

    let emailed = false;
    const owner = process.env.OWNER_EMAIL;
    if (ctx.mode === "live" && owner && hasResendKey()) {
      try {
        const { subject, html } = weeklyOwnerReportEmail({ week, stats, narrative });
        await sendEmail(owner, subject, html);
        emailed = true;
      } catch {
        /* best-effort — the run row still records everything */
      }
    }

    return {
      summary: `דוח שבועי ${week}: ${signupsThisWeek} הרשמות · MRR ₪${mrr.toLocaleString()} · ${pendingProposals} הצעות ממתינות${emailed ? " · נשלח במייל" : ""}`,
      proposedActions: [],
      output: { week, stats: stats as unknown as Record<string, unknown>, narrative, emailed },
      tokens,
      dedupKey: `weekly-report:${week}`,
    };
  },
};

const NARRATIVE_SYSTEM = `אתה אנליסט עסקי של Robert — SaaS ישראלי לבוטים בוואטסאפ.
תקבל נתוני שבוע מחושבים. כתוב סיכום אסטרטגי קצר בעברית: 3-4 משפטים בלבד.
כלול: מגמה עיקרית, נקודה אחת לשיפור, והמלצה קונקרטית אחת לשבוע הבא.
אל תמציא מספרים שלא קיבלת. החזר טקסט רגיל בלבד (לא JSON, לא כותרות).`;

function narrativePrompt(s: WeeklyStats): string {
  return `נתוני השבוע:
- הרשמות: ${s.signupsThisWeek} (שבוע קודם: ${s.signupsLastWeek})
- MRR: ₪${s.mrr} · לקוחות משלמים: ${s.paying} · מנויי חינם: ${s.comps}
- אירועי תשלום השבוע: ${s.paymentsThisWeek}
- ביטולים השבוע: ${s.cancellationsThisWeek ?? "לא ידוע"}
- התראות פעילות: ${s.alerts.length ? s.alerts.join(" | ") : "אין"}
- הצעות סוכנים ממתינות לאישור: ${s.pendingProposals}
- צריכת טוקנים של הסוכנים השבוע: ${s.tokensThisWeek}

כתוב את הסיכום.`;
}
