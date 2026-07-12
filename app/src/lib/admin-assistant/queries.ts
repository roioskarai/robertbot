import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { payingMetrics } from "@/lib/admin-metrics";
import { planLabelHe } from "@/lib/plans";
import type { ProposedAction } from "@/lib/types";

// ── The fixed, safe query registry for the admin AI assistant ──────────────
//
// SECURITY MODEL: there is NO free-form SQL anywhere. The model may only pick
// one of these query ids and supply params that a zod schema re-validates.
// Every run() uses explicit column selects, hard row caps, and never returns
// secret columns (totp_secret, payment ids, tokens).

type Db = ReturnType<typeof createAdminClient>;

export interface QueryResult {
  /** Structured facts for the phrasing step + the "show data" expander. */
  facts: Record<string, string | number>;
  /** Optional row sample (already capped + column-projected). */
  rows?: Record<string, unknown>[];
}

export interface AssistantQuery<P = Record<string, never>> {
  id: string;
  labelHe: string;
  /** Tells Claude WHEN to pick this query (Hebrew, shown in the intent prompt). */
  descriptionForIntent: string;
  params: z.ZodType<P>;
  run(db: Db, params: P): Promise<QueryResult>;
}

const ROW_CAP = 100;
const monthPeriod = (d = new Date()) => d.toISOString().slice(0, 7);
const daysAgoIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

// Helper to declare a query with correct param typing.
function q<P>(def: AssistantQuery<P>): AssistantQuery<P> {
  return def;
}

const daysParam = (def = 30) =>
  z.object({ days: z.coerce.number().int().min(1).max(365).default(def) });

export const ASSISTANT_QUERIES: AssistantQuery<never>[] = [
  q({
    id: "mrr_summary",
    labelHe: "כמה כסף נכנס (MRR)",
    descriptionForIntent: "הכנסה חודשית חוזרת, לקוחות משלמים, פילוח מסלולים, מנויי חינם",
    params: z.object({}),
    async run(db) {
      const { data } = await db.from("users")
        .select("plan, billing_cycle, subscription_status, is_comp")
        .neq("role", "admin");
      const m = payingMetrics(data ?? []);
      const planMix = Object.entries(m.planMix)
        .map(([p, n]) => `${planLabelHe(p as never)}: ${n}`).join(", ");
      return {
        facts: {
          "הכנסה חודשית (MRR) בשקלים": m.mrr,
          "הכנסה שנתית (ARR) בשקלים": m.mrr * 12,
          "לקוחות משלמים": m.paying,
          "מנויי חינם (comp)": m.comps,
          "פילוח מסלולים": planMix || "אין",
        },
      };
    },
  }),

  q({
    id: "signups_count",
    labelHe: "כמה נרשמו לאחרונה",
    descriptionForIntent: "מספר הרשמות/משתמשים חדשים בטווח ימים",
    params: daysParam(30),
    async run(db, { days }) {
      const { count } = await db.from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", daysAgoIso(days));
      return { facts: { "ימים אחורה": days, "משתמשים חדשים": count ?? 0 } };
    },
  }),

  q({
    id: "trial_conversion",
    labelHe: "אחוז המרה מניסיון",
    descriptionForIntent: "כמה ממשתמשי הניסיון הפכו למשלמים, שיעור המרה",
    params: z.object({}),
    async run(db) {
      const { data } = await db.from("users")
        .select("subscription_status, is_comp").neq("role", "admin");
      const rows = data ?? [];
      const trial = rows.filter((r) => r.subscription_status === "trial").length;
      const paying = rows.filter((r) => r.subscription_status === "active" && !r.is_comp).length;
      const total = trial + paying;
      const rate = total > 0 ? Math.round((paying / total) * 100) : 0;
      return {
        facts: {
          "בניסיון כרגע": trial,
          "משלמים": paying,
          "שיעור המרה מוערך (%)": rate,
        },
      };
    },
  }),

  q({
    id: "churn_list",
    labelHe: "מי עומד לעזוב / ביטל",
    descriptionForIntent: "לקוחות בסיכון נטישה: ביטלו, השהו, או ניסיון שפג",
    params: daysParam(30),
    async run(db) {
      const { data } = await db.from("users")
        .select("email, plan, subscription_status, subscription_ends_at")
        .in("subscription_status", ["cancelled", "paused"])
        .neq("role", "admin")
        .order("subscription_ends_at", { ascending: false })
        .limit(ROW_CAP);
      const rows = (data ?? []).map((r) => ({
        אימייל: r.email,
        מסלול: planLabelHe(r.plan as never),
        סטטוס: r.subscription_status === "cancelled" ? "בוטל" : "מושהה",
      }));
      return { facts: { "לקוחות בסיכון": rows.length }, rows };
    },
  }),

  q({
    id: "top_bots_by_messages",
    labelHe: "הבוטים הכי פעילים",
    descriptionForIntent: "אילו בוטים שולחים הכי הרבה הודעות החודש",
    params: z.object({ limit: z.coerce.number().int().min(1).max(20).default(10) }),
    async run(db, { limit }) {
      const { data: usage } = await db.from("usage_logs")
        .select("bot_id, message_count").eq("period", monthPeriod());
      const byBot = new Map<string, number>();
      for (const u of usage ?? [])
        byBot.set(u.bot_id, (byBot.get(u.bot_id) ?? 0) + (u.message_count ?? 0));
      const top = [...byBot.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      const ids = top.map(([id]) => id);
      const { data: bots } = ids.length
        ? await db.from("bots").select("id, name").in("id", ids)
        : { data: [] };
      const nameById = new Map((bots ?? []).map((b) => [b.id, b.name]));
      const rows = top.map(([id, n]) => ({ בוט: nameById.get(id) ?? id, "הודעות החודש": n }));
      return { facts: { "בוטים פעילים החודש": byBot.size }, rows };
    },
  }),

  q({
    id: "user_lookup",
    labelHe: "פרטים על משתמש לפי אימייל",
    descriptionForIntent: "מידע על משתמש ספציפי כשמוזכר אימייל: מסלול, סטטוס, כניסה אחרונה",
    params: z.object({ email: z.string().trim().toLowerCase().min(3).max(160) }),
    async run(db, { email }) {
      // Safe columns only — never totp/payment ids.
      const { data } = await db.from("users")
        .select("email, full_name, plan, subscription_status, is_comp, is_suspended, pack_balance, trial_ends_at, subscription_ends_at, last_login_at, created_at")
        .ilike("email", `%${email}%`)
        .limit(5);
      const rows = (data ?? []).map((r) => ({
        אימייל: r.email,
        שם: r.full_name ?? "—",
        מסלול: planLabelHe(r.plan as never),
        סטטוס: r.subscription_status,
        חינם: r.is_comp ? "כן" : "לא",
        חסום: r.is_suspended ? "כן" : "לא",
        "כניסה אחרונה": r.last_login_at ? new Date(r.last_login_at).toLocaleDateString("he-IL") : "מעולם לא",
      }));
      return { facts: { "נמצאו משתמשים": rows.length }, rows };
    },
  }),

  q({
    id: "usage_this_month",
    labelHe: "כמה הודעות נשלחו החודש",
    descriptionForIntent: "סך ההודעות/השימוש הכולל של כל המערכת החודש",
    params: z.object({}),
    async run(db) {
      const { data } = await db.from("usage_logs")
        .select("message_count").eq("period", monthPeriod());
      const total = (data ?? []).reduce((s, r) => s + (r.message_count ?? 0), 0);
      return { facts: { חודש: monthPeriod(), "סך הודעות": total, "רשומות שימוש": (data ?? []).length } };
    },
  }),

  q({
    id: "agent_token_spend",
    labelHe: "כמה טוקנים הסוכנים צרכו",
    descriptionForIntent: "עלות/צריכת טוקנים של סוכני ה-AI בטווח ימים",
    params: daysParam(30),
    async run(db, { days }) {
      const { data } = await db.from("agent_runs")
        .select("agent, tokens, created_at").gte("created_at", daysAgoIso(days)).limit(1000);
      const byAgent = new Map<string, number>();
      let total = 0;
      for (const r of data ?? []) {
        total += r.tokens ?? 0;
        byAgent.set(r.agent, (byAgent.get(r.agent) ?? 0) + (r.tokens ?? 0));
      }
      const rows = [...byAgent.entries()].map(([agent, tokens]) => ({ סוכן: agent, טוקנים: tokens }));
      return { facts: { "ימים אחורה": days, "סך טוקנים": total }, rows };
    },
  }),

  q({
    id: "low_pack_balances",
    labelHe: "מי עומד לגמור מכסה",
    descriptionForIntent: "משתמשים משלמים עם יתרת חבילות נמוכה שעלולים להיתקע",
    params: z.object({ threshold: z.coerce.number().int().min(0).max(1000).default(50) }),
    async run(db, { threshold }) {
      const { data } = await db.from("users")
        .select("email, plan, pack_balance")
        .eq("subscription_status", "active")
        .lte("pack_balance", threshold)
        .gt("pack_balance", 0)
        .order("pack_balance", { ascending: true })
        .limit(ROW_CAP);
      const rows = (data ?? []).map((r) => ({
        אימייל: r.email, מסלול: planLabelHe(r.plan as never), "יתרת חבילות": r.pack_balance,
      }));
      return { facts: { סף: threshold, "משתמשים מתחת לסף": rows.length }, rows };
    },
  }),

  q({
    id: "pending_proposals",
    labelHe: "הצעות סוכנים ממתינות",
    descriptionForIntent: "כמה הצעות של סוכני ה-AI ממתינות לאישור",
    params: z.object({}),
    async run(db) {
      const { data } = await db.from("agent_runs")
        .select("agent, proposed_actions")
        .order("created_at", { ascending: false }).limit(200);
      let pending = 0;
      const byAgent = new Map<string, number>();
      for (const r of data ?? []) {
        const acts = Array.isArray(r.proposed_actions) ? (r.proposed_actions as ProposedAction[]) : [];
        const p = acts.filter((a) => a.status === "pending").length;
        pending += p;
        if (p) byAgent.set(r.agent, (byAgent.get(r.agent) ?? 0) + p);
      }
      const rows = [...byAgent.entries()].map(([agent, n]) => ({ סוכן: agent, "הצעות ממתינות": n }));
      return { facts: { "סך הצעות ממתינות": pending }, rows };
    },
  }),
] as unknown as AssistantQuery<never>[];

export const ASSISTANT_QUERY_IDS = ASSISTANT_QUERIES.map((x) => x.id);

export function getQuery(id: string): AssistantQuery<never> | undefined {
  return ASSISTANT_QUERIES.find((x) => x.id === id);
}
