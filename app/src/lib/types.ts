import type { BillingCycle, PlanId } from "./plans";

export type Role = "admin" | "tenant";
export type SubscriptionStatus = "trial" | "active" | "cancelled" | "paused";
export type BotStyle = "friendly" | "professional" | "short";
export type ConversationStatus = "bot" | "human" | "closed";
export type FromType = "customer" | "bot" | "human";

export interface DBUser {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  plan: PlanId;
  billing_cycle: BillingCycle;
  trial_ends_at: string;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  pack_balance: number;
  created_at: string;
}

export interface Service {
  name: string;
  price: string; // e.g. "₪120" — kept as string to match the design data
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface DayHours {
  open: string; // "09:00"
  close: string; // "19:00"
  closed: boolean;
}

export type WorkingHours = Record<
  "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat",
  DayHours
>;

export interface Bot {
  id: string;
  user_id: string;
  name: string; // business name — "מספרת מיטל"
  bot_name: string; // display name in WhatsApp — "מיטל"
  business_type: string | null;
  business_subtype: string | null;
  description: string | null;
  services: Service[];
  working_hours: WorkingHours | null;
  address: string | null;
  phone: string | null;
  style: BotStyle;
  whatsapp_number: string | null;
  twilio_sid: string | null;
  active: boolean;
  system_prompt: string | null;
  message_templates: Record<string, unknown> | null;
  faq: FaqItem[];
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  bot_id: string;
  customer_phone: string;
  customer_name: string | null;
  status: ConversationStatus;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  from_type: FromType;
  body: string;
  twilio_message_sid: string | null;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  bot_id: string;
  period: string; // "2026-06"
  message_count: number;
}
