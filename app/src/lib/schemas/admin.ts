import { z } from "zod";
import { isPlanId } from "@/lib/plans";

/**
 * Zod schemas for admin routes. Unknown keys are stripped (zod default), so a
 * request body can never smuggle unrelated columns into a write — on top of
 * routes still building explicit update objects.
 */

/** ISO date string or null (clear). Normalized to a full ISO timestamp. */
const isoDateOrNull = z
  .union([z.null(), z.string().refine((v) => !Number.isNaN(Date.parse(v)), "תאריך לא תקין")])
  .transform((v) => (v === null ? null : new Date(v).toISOString()));

/** PATCH /api/admin/users/[id] — every field the admin may change. */
export const adminUserPatchSchema = z
  .object({
    plan: z.string().refine(isPlanId, "מסלול לא חוקי"),
    subscription_status: z.enum(["trial", "active", "cancelled", "paused"]),
    role: z.enum(["admin", "tenant"]),
    is_suspended: z.boolean(),
    pack_balance: z.number().int("יתרה לא תקינה").min(0, "יתרה לא תקינה"),
    subscription_ends_at: isoDateOrNull,
    trial_ends_at: isoDateOrNull,
    cancel_at_period_end: z.boolean(),
    is_comp: z.boolean(),
    comp_note: z.union([z.null(), z.string().trim().max(300, "ההערה ארוכה מדי")]),
    full_name: z.union([z.null(), z.string().trim().max(120, "השם ארוך מדי")]),
    // Email changes also update auth.users (handled in-route, service-role).
    email: z.string().trim().toLowerCase().email("אימייל לא תקין").max(160, "האימייל ארוך מדי"),
    /** Free-text reason — stored in the audit meta only, never on the user row. */
    _note: z.string().trim().max(300, "ההערה ארוכה מדי"),
  })
  .partial()
  .refine(
    (v) => Object.keys(v).some((k) => k !== "_note" && v[k as keyof typeof v] !== undefined),
    "אין שדות תקינים לעדכון",
  );

export type AdminUserPatchInput = z.infer<typeof adminUserPatchSchema>;

/** DELETE /api/admin/users/[id] — email confirmation guard. */
export const adminUserDeleteSchema = z.object({
  confirmEmail: z.string().trim().email("אימייל לא תקין"),
});

/** POST /api/admin/agents/actions — approve/dismiss/apply a proposed action. */
export const agentActionDecisionSchema = z.object({
  runId: z.string().uuid("מזהה ריצה לא תקין"),
  actionIndex: z.number().int().min(0).max(200),
  decision: z.enum(["approve", "dismiss", "apply"]),
});

/** POST /api/admin/assistant — a natural-language admin question. */
export const assistantAskSchema = z.object({
  question: z.string().trim().min(2, "שאלה קצרה מדי").max(500, "השאלה ארוכה מדי"),
});
