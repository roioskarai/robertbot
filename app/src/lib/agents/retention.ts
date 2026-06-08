import { PLAN_LIMITS, planLabelHe, type PlanId } from "@/lib/plans";
import type { AgentResult, ProposedAction } from "@/lib/types";
import { callClaude, extractJson, type Agent, type AgentContext } from "./runner";

/**
 * retention — scans the tenant base for churn signals (trial ending, paused,
 * cancelled, near-zero usage) and drafts a personalized Hebrew win-back /
 * conversion message per at-risk account.
 *
 * Reliability: money-touching by nature, so it is STRICTLY draft-only. It
 * proposes offers (with a recommended discount) for human approval and never
 * sends an email or applies a discount itself. Idempotent per day.
 */

const MAX_USERS_PER_RUN = 12;
const LOW_USAGE_PCT = 0.1; // active subscribers below 10% of quota are at risk
const MIN_AGE_DAYS = 20; // don't flag brand-new accounts as "low usage"

type Risk = "cancelled" | "trial_lapsed" | "paused" | "trial_ending" | "low_usage";

const RISK_LABEL: Record<Risk, string> = {
  cancelled: "ביטל מנוי",
  trial_lapsed: "ניסיון הסתיים ללא המרה",
  paused: "מנוי מושהה",
  trial_ending: "ניסיון מסתיים בקרוב",
  low_usage: "שימוש נמוך מאוד",
};

const RISK_PRIORITY: Risk[] = [
  "trial_ending",
  "trial_lapsed",
  "cancelled",
  "paused",
  "low_usage",
];

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: PlanId;
  subscription_status: "trial" | "active" | "cancelled" | "paused";
  trial_ends_at: string;
  created_at: string;
}

interface AtRisk extends UserRow {
  risk: Risk;
  usedThisMonth: number;
}

interface Offer {
  subject: string; // email subject (Hebrew)
  body: string; // email body (Hebrew, plain text)
  recommendedDiscountPct: number; // 0–40
  reason: string; // why this offer, Hebrew
}

export const retention: Agent = {
  name: "retention",
  async run(ctx: AgentContext): Promise<AgentResult> {
    const now = ctx.now;
    const monthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const in2days = new Date(now.getTime() + 2 * 86_400_000);

    const { data: users } = await ctx.supabase
      .from("users")
      .select(
        "id, email, full_name, plan, subscription_status, trial_ends_at, created_at",
      )
      .neq("role", "admin")
      .limit(500);

    const { data: usage } = await ctx.supabase
      .from("usage_logs")
      .select("user_id, message_count")
      .eq("period", monthPeriod);

    const usedByUser = new Map<string, number>();
    for (const u of usage ?? [])
      usedByUser.set(u.user_id, (usedByUser.get(u.user_id) ?? 0) + (u.message_count ?? 0));

    const atRisk: AtRisk[] = [];
    for (const u of (users as UserRow[]) ?? []) {
      const used = usedByUser.get(u.id) ?? 0;
      const ageDays = (now.getTime() - new Date(u.created_at).getTime()) / 86_400_000;
      const trialEnds = new Date(u.trial_ends_at);
      let risk: Risk | null = null;

      if (u.subscription_status === "cancelled") risk = "cancelled";
      else if (u.subscription_status === "paused") risk = "paused";
      else if (u.subscription_status === "trial" && trialEnds < now) risk = "trial_lapsed";
      else if (
        u.subscription_status === "trial" &&
        trialEnds >= now &&
        trialEnds <= in2days
      )
        risk = "trial_ending";
      else if (
        u.subscription_status === "active" &&
        ageDays >= MIN_AGE_DAYS &&
        used < PLAN_LIMITS[u.plan].messages * LOW_USAGE_PCT
      )
        risk = "low_usage";

      if (risk) atRisk.push({ ...u, risk, usedThisMonth: used });
    }

    atRisk.sort(
      (a, b) => RISK_PRIORITY.indexOf(a.risk) - RISK_PRIORITY.indexOf(b.risk),
    );
    const selected = atRisk.slice(0, MAX_USERS_PER_RUN);

    const proposedActions: ProposedAction[] = [];
    let tokens = 0;
    for (const u of selected) {
      try {
        const { text, tokens: t } = await callClaude({
          system: RETENTION_SYSTEM,
          prompt: retentionPrompt(u),
          maxTokens: 700,
        });
        tokens += t;
        const offer = extractJson<Offer>(text);
        proposedActions.push({
          type: "retention_offer",
          target: u.id,
          label: `${RISK_LABEL[u.risk]} — ${u.full_name || u.email} (הנחה מוצעת ${offer.recommendedDiscountPct}%)`,
          payload: {
            channel: "email",
            email: u.email,
            subject: offer.subject,
            body: offer.body,
            recommendedDiscountPct: offer.recommendedDiscountPct,
            reason: offer.reason,
            risk: u.risk,
          },
          status: "pending",
        });
      } catch {
        // keep the run alive if one offer fails to generate/parse
      }
    }

    const summary =
      atRisk.length === 0
        ? "אין כרגע לקוחות בסיכון נטישה 🎉"
        : `${atRisk.length} לקוחות בסיכון — הוכנו ${proposedActions.length} הצעות שימור לאישור`;

    return {
      summary,
      proposedActions,
      output: {
        atRisk: atRisk.length,
        byRisk: countBy(atRisk.map((u) => u.risk)),
        drafted: proposedActions.length,
      },
      tokens,
      dedupKey: `retention:${ctx.period}`,
    };
  },
};

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, k) => {
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

const RETENTION_SYSTEM = `אתה מומחה שימור לקוחות (retention) עבור Robert — שירות בוטים לוואטסאפ לעסקים קטנים בישראל.
המטרה: לכתוב הודעת שימור/המרה אישית, חמה וקצרה בעברית, שתחזיר את הלקוח.
אתה מחזיר אך ורק JSON תקין במבנה:
{
  "subject": "שורת נושא קצרה למייל",
  "body": "גוף ההודעה בעברית, 2-4 משפטים, אישי וללא לחץ אגרסיבי. בלי placeholders.",
  "recommendedDiscountPct": מספר בין 0 ל-40 (0 אם לא נדרשת הנחה),
  "reason": "משפט קצר: למה ההצעה הזו מתאימה ללקוח הזה"
}
כללים: התאם את עוצמת ההצעה לחומרת הסיכון (ביטול/השהיה → הנחה גבוהה יותר; ניסיון מסתיים → דגש על ערך). אל תבטיח דברים שלא קיימים.`;

function retentionPrompt(u: AtRisk): string {
  return `לקוח בסיכון נטישה:
- שם: ${u.full_name || "(לא ידוע)"}
- מסלול: ${planLabelHe(u.plan)}
- סטטוס: ${u.subscription_status}
- סוג הסיכון: ${RISK_LABEL[u.risk]}
- שימוש החודש: ${u.usedThisMonth} הודעות מתוך מכסה של ${PLAN_LIMITS[u.plan].messages}

כתוב הצעת שימור והחזר JSON לפי המבנה.`;
}
