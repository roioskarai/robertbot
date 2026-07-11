// Pure state machine for proposed_actions approval — the missing half of the
// draft-only agent design. Agents only ever write status:"pending"; this
// module is the ONLY place a status may legally change.
//
// Rules:
//   pending  → approved | dismissed
//   approved → applied            (ONLY for bot-config drafts)
//   anything else                 → rejected
//
// retention_offer is deliberately NEVER appliable: applying would mean the
// system sends a customer a money-touching message by itself. The owner
// copies the approved draft and sends it manually.

import type { ProposedAction } from "@/lib/types";

export const APPLYABLE_TYPES = ["prompt_improvement", "faq_addition"] as const;

export type ActionDecision = "approve" | "dismiss" | "apply";

export type TransitionResult =
  | { ok: true; actions: ProposedAction[]; action: ProposedAction }
  | { ok: false; error: string };

export function isApplyable(type: string): boolean {
  return (APPLYABLE_TYPES as readonly string[]).includes(type);
}

/** Returns a NEW actions array with the transition applied (never mutates). */
export function transitionAction(
  actions: ProposedAction[],
  index: number,
  decision: ActionDecision,
): TransitionResult {
  const current = actions[index];
  if (!current) return { ok: false, error: "ההצעה לא נמצאה" };

  let next: ProposedAction["status"];
  if (decision === "approve") {
    if (current.status !== "pending") return { ok: false, error: "אפשר לאשר רק הצעה ממתינה" };
    next = "approved";
  } else if (decision === "dismiss") {
    if (current.status !== "pending") return { ok: false, error: "אפשר לדחות רק הצעה ממתינה" };
    next = "dismissed";
  } else {
    if (!isApplyable(current.type)) {
      return { ok: false, error: "הצעה מסוג זה אינה ניתנת להחלה אוטומטית — העתק ושלח ידנית" };
    }
    if (current.status !== "approved") return { ok: false, error: "יש לאשר את ההצעה לפני החלה" };
    next = "applied";
  }

  const updated = actions.map((a, i) => (i === index ? { ...a, status: next } : a));
  return { ok: true, actions: updated, action: updated[index] };
}

/** ISO-8601 week key, e.g. "2026-W28" — dedup key for the weekly report. */
export function isoWeekKey(date: Date): string {
  // Thursday-of-week trick: ISO weeks belong to the year of their Thursday.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
