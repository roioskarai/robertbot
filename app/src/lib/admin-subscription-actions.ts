// Pure action layer for the admin Subscription Management Center.
//
// Each action turns a small Hebrew form into EXACTLY the payload that
// PATCH /api/admin/users/[id] already accepts — no new mutation surface.
// simulate() previews the result through deriveSubscriptionState(), the same
// source of truth the customer dashboard renders, so the before→after panel
// can never drift from what the user will actually see.

import { deriveSubscriptionState, type SubscriptionRow, type SubscriptionState } from "@/lib/subscription";
import { isPlanId } from "@/lib/plans";

export interface SubActionUser extends SubscriptionRow {
  plan?: string | null;
  subscription_status?: string | null;
}

export interface SubActionField {
  key: string;
  labelHe: string;
  type: "plan" | "number" | "datetime" | "checkbox";
  required?: boolean;
  hintHe?: string;
}

export type BuildResult = { ok: true; patch: Record<string, unknown> } | { ok: false, error: string };

export interface SubAction {
  id: string;
  labelHe: string;
  descHe: string;
  danger?: boolean;
  fields: SubActionField[];
  /** Whether the action makes sense for the user's current derived status. */
  visible(state: SubscriptionState): boolean;
  buildPatch(user: SubActionUser, input: Record<string, unknown>, now?: Date): BuildResult;
}

function parseFutureDate(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Base date for extension: the current end when still ahead, else now. */
function extendBase(iso: string | null | undefined, now: Date): Date {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime()) && d.getTime() > now.getTime()) return d;
  }
  return now;
}

export const SUB_ACTIONS: SubAction[] = [
  {
    id: "change_plan",
    labelHe: "שינוי מסלול",
    descHe: "מעביר את המשתמש למסלול אחר. המחיר והמכסות מתעדכנים מיידית.",
    fields: [{ key: "plan", labelHe: "מסלול חדש", type: "plan", required: true }],
    visible: () => true,
    buildPatch: (_user, input) => {
      const plan = input.plan;
      if (typeof plan !== "string" || !isPlanId(plan)) return { ok: false, error: "בחר מסלול" };
      return { ok: true, patch: { plan } };
    },
  },
  {
    id: "extend_period",
    labelHe: "הארכת / קיצור תקופה",
    descHe: "מזיז את תאריך הסיום (ניסיון או מנוי) במספר ימים. מספר שלילי מקצר.",
    fields: [{
      key: "days", labelHe: "מספר ימים", type: "number", required: true,
      hintHe: "לדוגמה: 14 להארכה בשבועיים, ‎-7 לקיצור בשבוע",
    }],
    visible: (s) => s.status !== "cancelled",
    buildPatch: (user, input, now = new Date()) => {
      const days = Math.trunc(Number(input.days));
      if (!days || Number.isNaN(days) || Math.abs(days) > 365) {
        return { ok: false, error: "הזן מספר ימים בין ‎-365 ל-365 (לא 0)" };
      }
      const state = deriveSubscriptionState(user, now);
      const isTrial = state.status === "trial" || state.status === "trial_expired";
      const base = extendBase(isTrial ? user.trial_ends_at : user.subscription_ends_at, now);
      const target = new Date(base.getTime() + days * 86_400_000);
      if (target.getTime() <= now.getTime()) {
        return { ok: false, error: "התאריך המתקבל כבר עבר — קיצור גדול מדי" };
      }
      return {
        ok: true,
        patch: isTrial
          ? { trial_ends_at: target.toISOString(), subscription_status: "trial" }
          : { subscription_ends_at: target.toISOString() },
      };
    },
  },
  {
    id: "trial_to_paid",
    labelHe: "המרת ניסיון למנוי פעיל",
    descHe: "מפעיל מנוי בתשלום ידנית (למשל אחרי תשלום מחוץ למערכת). קבע עד מתי המנוי בתוקף.",
    fields: [
      { key: "plan", labelHe: "מסלול", type: "plan", required: true },
      { key: "until", labelHe: "בתוקף עד", type: "datetime", required: true },
    ],
    visible: (s) => s.status === "trial" || s.status === "trial_expired",
    buildPatch: (_user, input, now = new Date()) => {
      const plan = input.plan;
      if (typeof plan !== "string" || !isPlanId(plan)) return { ok: false, error: "בחר מסלול" };
      const until = parseFutureDate(input.until);
      if (!until || new Date(until).getTime() <= now.getTime()) {
        return { ok: false, error: "בחר תאריך תוקף עתידי" };
      }
      return {
        ok: true,
        patch: {
          plan,
          subscription_status: "active",
          cancel_at_period_end: false,
          is_comp: false,
          subscription_ends_at: until,
        },
      };
    },
  },
  {
    id: "pause",
    labelHe: "הקפאת מנוי",
    descHe: "מקפיא את המנוי — הבוטים מפסיקים לענות ואין חיוב. אפשר לשחזר בכל רגע.",
    danger: true,
    fields: [],
    visible: (s) => s.status === "active" || s.status === "cancel_scheduled",
    buildPatch: () => ({ ok: true, patch: { subscription_status: "paused" } }),
  },
  {
    id: "cancel",
    labelHe: "ביטול מנוי",
    descHe: "מבטל את המנוי. סמן 'בסוף התקופה' כדי לאפשר שימוש עד תאריך הסיום הנוכחי.",
    danger: true,
    fields: [{
      key: "atPeriodEnd", labelHe: "ביטול בסוף התקופה (לא מיידי)", type: "checkbox",
      hintHe: "ללא סימון — הביטול מיידי והבוטים מפסיקים לענות עכשיו",
    }],
    visible: (s) => s.status === "active" || s.status === "cancel_scheduled" || s.status === "paused",
    buildPatch: (_user, input) =>
      input.atPeriodEnd === true
        ? { ok: true, patch: { subscription_status: "active", cancel_at_period_end: true } }
        : { ok: true, patch: { subscription_status: "cancelled", cancel_at_period_end: false } },
  },
  {
    id: "restore",
    labelHe: "שחזור מנוי",
    descHe: "מחזיר מנוי מבוטל/מוקפא למצב פעיל. קבע עד מתי בתוקף (אופציונלי).",
    fields: [{ key: "until", labelHe: "בתוקף עד (אופציונלי)", type: "datetime" }],
    visible: (s) => s.status === "cancelled" || s.status === "paused" || s.status === "cancel_scheduled",
    buildPatch: (user, input, now = new Date()) => {
      const patch: Record<string, unknown> = {
        subscription_status: "active",
        cancel_at_period_end: false,
      };
      const until = parseFutureDate(input.until);
      if (input.until && !until) return { ok: false, error: "תאריך לא תקין" };
      if (until) {
        if (new Date(until).getTime() <= now.getTime()) return { ok: false, error: "בחר תאריך עתידי" };
        patch.subscription_ends_at = until;
      } else if (user.subscription_ends_at && new Date(user.subscription_ends_at).getTime() <= now.getTime()) {
        // Old end date already passed — restoring without a new date would
        // re-expire immediately; push it a month ahead.
        patch.subscription_ends_at = new Date(now.getTime() + 30 * 86_400_000).toISOString();
      }
      return { ok: true, patch };
    },
  },
  {
    id: "comp_grant",
    labelHe: "הענקת מסלול חינם",
    descHe: "מסלול מלא ללא תשלום עד תאריך. לא נספר ב-MRR; בפקיעה המנוי מסומן 'בוטל' והבוטים כבים.",
    fields: [
      { key: "plan", labelHe: "מסלול", type: "plan", required: true },
      { key: "until", labelHe: "תוקף עד", type: "datetime", required: true },
    ],
    visible: (s) => !s.isComp,
    buildPatch: (_user, input, now = new Date()) => {
      const plan = input.plan;
      if (typeof plan !== "string" || !isPlanId(plan)) return { ok: false, error: "בחר מסלול" };
      const until = parseFutureDate(input.until);
      if (!until || new Date(until).getTime() <= now.getTime()) {
        return { ok: false, error: "בחר תאריך תוקף עתידי" };
      }
      return {
        ok: true,
        patch: {
          plan,
          subscription_status: "active",
          is_comp: true,
          cancel_at_period_end: true, // the trial-cron enforces expiry via this flag
          subscription_ends_at: until,
        },
      };
    },
  },
  {
    id: "comp_revoke",
    labelHe: "ביטול הענקה",
    descHe: "מסיים את המסלול החינמי מיידית — הסטטוס עובר ל'בוטל' והלקוח יתבקש לשלם.",
    danger: true,
    fields: [],
    visible: (s) => s.isComp,
    buildPatch: () => ({
      ok: true,
      patch: {
        is_comp: false,
        subscription_status: "cancelled",
        cancel_at_period_end: false,
        subscription_ends_at: null,
      },
    }),
  },
];

/** Preview: derived state before vs after the patch — same function the UI renders. */
export function simulate(
  user: SubActionUser,
  patch: Record<string, unknown>,
  now: Date = new Date(),
): { before: SubscriptionState; after: SubscriptionState } {
  return {
    before: deriveSubscriptionState(user, now),
    after: deriveSubscriptionState({ ...user, ...patch } as SubscriptionRow, now),
  };
}

export function actionsForState(state: SubscriptionState): SubAction[] {
  return SUB_ACTIONS.filter((a) => a.visible(state));
}
