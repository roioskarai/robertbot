// Pure, client-safe helpers for the global admin audit trail.
// Server-side writing lives in lib/admin-audit.ts; this module is imported
// by UI pages and unit tests too, so it must stay dependency-free.

export interface AdminAuditEntry {
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_type?: string;
  target_id?: string;
  target_label?: string;
  diff?: { before: Record<string, unknown>; after: Record<string, unknown> } | null;
  meta?: Record<string, unknown> | null;
}

/** Hebrew labels for audit action codes (UI + reports). */
export const AUDIT_ACTION_HE: Record<string, string> = {
  "subscription.change": "שינוי מנוי",
  "subscription.comp_grant": "הענקת מסלול חינם",
  "subscription.comp_revoke": "ביטול הענקה",
  "user.update": "עדכון פרטי משתמש",
  "user.email_change": "שינוי אימייל",
  "user.suspend": "חסימת משתמש",
  "user.unsuspend": "שחרור חסימה",
  "user.role_change": "שינוי תפקיד",
  "user.delete": "מחיקת משתמש",
  "user.password_reset_sent": "שליחת איפוס סיסמה",
  "user.message_sent": "הודעה נשלחה למשתמש",
  "bot.whatsapp_reset": "איפוס חיבור וואטסאפ",
  "auth.login": "כניסת אדמין",
  "auth.login_failed": "נסיון כניסה כושל",
  "auth.password_change": "שינוי סיסמת אדמין",
  "auth.2fa_enable": "הפעלת 2FA",
  "auth.2fa_verify_failed": "קוד 2FA שגוי",
  "agent.trigger": "הרצת סוכן",
  "agent.action_approve": "אישור הצעת סוכן",
  "agent.action_apply": "החלת הצעת סוכן",
  "agent.action_dismiss": "דחיית הצעת סוכן",
  "assistant.ask": "שאלה לעוזר AI",
  "feedback.cancellation": "משוב ביטול מנוי",
  "users.export": "ייצוא רשימת משתמשים",
  "security.webhook_signature_failed": "כשל חתימת Webhook",
  "system.maintenance_on": "הפעלת מצב תחזוקה",
  "system.maintenance_off": "כיבוי מצב תחזוקה",
  "system.flag_toggle": "שינוי דגל פיצ'ר",
  "site.restore_defaults": "שחזור לברירת מחדל",
};

/** Hebrew labels for the fields that appear in audit diffs. */
export const AUDIT_FIELD_HE: Record<string, string> = {
  plan: "מסלול",
  subscription_status: "סטטוס מנוי",
  role: "תפקיד",
  is_suspended: "חסום",
  pack_balance: "יתרת חבילות",
  subscription_ends_at: "סיום מנוי",
  trial_ends_at: "סיום ניסיון",
  cancel_at_period_end: "ביטול בסוף תקופה",
  is_comp: "מסלול חינם",
  comp_note: "הערת הענקה",
  full_name: "שם מלא",
  email: "אימייל",
};

/**
 * Changed-keys-only diff: for each key in `keys`, include it in before/after
 * only when the value actually changed. Values are compared by JSON identity
 * (good enough for the scalar/JSONB columns we audit).
 */
export function diffOf(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of keys) {
    const prev = before[key] ?? null;
    const next = after[key] ?? null;
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      b[key] = prev;
      a[key] = next;
    }
  }
  return { before: b, after: a };
}

/**
 * True when a query failed because the table isn't migrated yet:
 * Postgres 42P01 (undefined_table) or PostgREST PGRST205 / schema-cache miss.
 */
export function isMissingTableError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: unknown; message?: unknown };
  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}
