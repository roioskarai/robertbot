import { z } from "zod";
import { LIMITS } from "@/lib/validation";

/**
 * Zod schemas for tenant bot input. Unknown keys are stripped (zod default),
 * so request bodies can never smuggle columns like user_id / wa_access_token
 * into a write — on top of the routes building explicit update objects.
 */

const serviceSchema = z.object({
  name: z.string().trim().min(1, "חסר שם שירות").max(LIMITS.serviceName, "שם השירות ארוך מדי"),
  price: z.string().trim().max(40, "מחיר ארוך מדי"),
});

const faqItemSchema = z.object({
  question: z.string().trim().min(1, "חסרה שאלה").max(LIMITS.faqField, "השאלה ארוכה מדי"),
  answer: z.string().trim().min(1, "חסרה תשובה").max(LIMITS.faqField, "התשובה ארוכה מדי"),
});

const timeString = z.string().regex(/^\d{1,2}:\d{2}$/, "שעה לא תקינה");

const dayHoursSchema = z.object({
  open: timeString,
  close: timeString,
  closed: z.boolean(),
});

const workingHoursSchema = z.object({
  sun: dayHoursSchema,
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
});

/** Every field a tenant may set on a bot (create/update surface). */
const botEditable = z.object({
  name: z.string().trim().min(1, "חסר שם עסק").max(LIMITS.name, "שם העסק ארוך מדי"),
  bot_name: z.string().trim().min(1, "חסר שם בוט").max(LIMITS.name, "שם הבוט ארוך מדי"),
  business_type: z.string().trim().max(80).nullable(),
  business_subtype: z.string().trim().max(80).nullable(),
  description: z.string().trim().max(LIMITS.description, "התיאור ארוך מדי").nullable(),
  services: z.array(serviceSchema).max(50, "יותר מדי שירותים"),
  working_hours: workingHoursSchema.nullable(),
  address: z.string().trim().max(LIMITS.address, "הכתובת ארוכה מדי").nullable(),
  phone: z.string().trim().max(30, "מספר הטלפון ארוך מדי").nullable(),
  style: z.enum(["friendly", "professional", "short"]),
  faq: z.array(faqItemSchema).max(100, "יותר מדי שאלות נפוצות"),
  active: z.boolean(),
});

/** POST /api/bots — name is required, everything else optional. */
export const botCreateSchema = botEditable.partial().extend({
  name: botEditable.shape.name,
  // Optional verified WhatsApp number from onboarding step 5. The route
  // rejects a number that isn't accompanied by a valid wa_verify_token
  // bound to the same user+number (see lib/wa-verify-token.ts).
  whatsapp_number: z.string().trim().max(30, "מספר הטלפון ארוך מדי").optional(),
  wa_verify_token: z.string().max(600).optional(),
});

/** PUT /api/bots/[id] — partial merge onto the existing row. */
export const botUpdateSchema = botEditable.partial();

export type BotCreateInput = z.infer<typeof botCreateSchema>;
export type BotUpdateInput = z.infer<typeof botUpdateSchema>;
