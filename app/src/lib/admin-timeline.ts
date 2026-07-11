// Pure builder for the admin user-detail timeline ("ציר זמן").
// Merges four sources — registration/login (users row), payment_events,
// admin_audit_log entries, agent_runs — into one Hebrew, desc-sorted list.
// Dependency-free (client-safe + unit-testable).

import { AUDIT_ACTION_HE, AUDIT_FIELD_HE } from "@/lib/admin-audit-core";

export type TimelineKind = "registration" | "login" | "payment" | "admin" | "agent";

export interface TimelineEvent {
  ts: string; // ISO
  kind: TimelineKind;
  labelHe: string;
  detailHe?: string;
}

export interface TimelineUser {
  created_at?: string | null;
  last_login_at?: string | null;
}

export interface TimelinePaymentEvent {
  event_type: string;
  created_at: string;
}

export interface TimelineAuditEntry {
  action: string;
  actor_email?: string | null;
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  meta?: { note?: string | null } | null;
  created_at: string;
}

export interface TimelineAgentRun {
  agent: string;
  status?: string | null;
  summary?: string | null;
  created_at: string;
}

const PAYMENT_HE: Record<string, string> = {
  subscription_active: "תשלום התקבל — מנוי הופעל",
  pack_purchased: "נרכשה חבילת הודעות",
  subscription_cancelled: "המנוי בוטל אצל ספק הסליקה",
  subscription_paused: "המנוי הוקפא אצל ספק הסליקה",
};

const AGENT_HE: Record<string, string> = {
  "conversation-analyst": "מנתח שיחות",
  retention: "שימור לקוחות",
};

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v === true) return "כן";
  if (v === false) return "לא";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v)))
    return new Date(v).toLocaleDateString("he-IL");
  return String(v);
}

/** "מסלול: basic → pro · סטטוס מנוי: trial → active" from an audit diff. */
export function diffSummaryHe(diff?: TimelineAuditEntry["diff"]): string {
  if (!diff?.after) return "";
  return Object.keys(diff.after)
    .map((k) => `${AUDIT_FIELD_HE[k] ?? k}: ${fmtVal(diff.before?.[k])} ← ${fmtVal(diff.after?.[k])}`)
    .join(" · ");
}

export function mergeTimeline(input: {
  user: TimelineUser;
  paymentEvents?: TimelinePaymentEvent[];
  auditEntries?: TimelineAuditEntry[];
  agentRuns?: TimelineAgentRun[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (input.user.created_at) {
    events.push({ ts: input.user.created_at, kind: "registration", labelHe: "הרשמה למערכת" });
  }
  if (input.user.last_login_at) {
    events.push({ ts: input.user.last_login_at, kind: "login", labelHe: "כניסה אחרונה" });
  }

  for (const p of input.paymentEvents ?? []) {
    if (!p.created_at) continue;
    events.push({
      ts: p.created_at,
      kind: "payment",
      labelHe: PAYMENT_HE[p.event_type] ?? `אירוע תשלום (${p.event_type})`,
    });
  }

  for (const a of input.auditEntries ?? []) {
    if (!a.created_at) continue;
    const detailParts = [diffSummaryHe(a.diff), a.meta?.note ? `הערה: ${a.meta.note}` : ""]
      .filter(Boolean);
    events.push({
      ts: a.created_at,
      kind: "admin",
      labelHe: AUDIT_ACTION_HE[a.action] ?? a.action,
      detailHe: detailParts.join(" · ") || undefined,
    });
  }

  for (const r of input.agentRuns ?? []) {
    if (!r.created_at) continue;
    events.push({
      ts: r.created_at,
      kind: "agent",
      labelHe: `סוכן ${AGENT_HE[r.agent] ?? r.agent}${r.status === "error" ? " — שגיאה" : ""}`,
      detailHe: r.summary ?? undefined,
    });
  }

  return events
    .filter((e) => !Number.isNaN(Date.parse(e.ts)))
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
}
