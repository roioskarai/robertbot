import { z } from "zod";

export { parseBody } from "./parse";
export { botCreateSchema, botUpdateSchema } from "./bot";
export type { BotCreateInput, BotUpdateInput } from "./bot";
export { adminUserPatchSchema, adminUserDeleteSchema, agentActionDecisionSchema, assistantAskSchema, maintenanceSchema, featureFlagSchema } from "./admin";
export type { AdminUserPatchInput } from "./admin";

/** POST /api/bots/[id]/connect — phone verification (OTP send / check). */
export const connectSchema = z.object({
  number: z.string().trim().min(1, "חסר מספר טלפון").max(30, "מספר הטלפון ארוך מדי"),
  code: z.string().trim().regex(/^\d{4,8}$/, "הקוד שגוי או פג תוקף").optional(),
});

/** POST /api/bots/[id]/connect-meta — Meta Embedded Signup completion. */
export const connectMetaSchema = z.object({
  code: z.string().trim().min(1, "חסרים פרטי חיבור (code/wabaId)").max(1024),
  wabaId: z.string().trim().min(1, "חסרים פרטי חיבור (code/wabaId)").max(64),
  phoneNumberId: z.string().trim().max(64).optional(),
  businessId: z.string().trim().max(64).optional(),
  displayNumber: z.string().trim().max(32).optional(),
  force: z.boolean().optional(),
});

/** POST /api/conversations/[id]/reply — human agent reply. */
export const replySchema = z.object({
  body: z.string().trim().min(1, "הודעה ריקה").max(4000, "ההודעה ארוכה מדי"),
});

/** POST /api/billing/checkout — product id (semantics checked by parseProduct). */
export const checkoutSchema = z.object({
  product: z.string().trim().min(1, "מוצר לא חוקי").max(64, "מוצר לא חוקי"),
});

/** POST /api/billing/downgrade — target plan (rank rules checked in-route). */
export const downgradeSchema = z.object({
  plan: z.string().trim().min(1, "מסלול לא חוקי").max(32, "מסלול לא חוקי"),
});
