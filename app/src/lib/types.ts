import type { BillingCycle, PlanId } from "./plans";
import type { PaymentProviderId } from "./payments/types";
import type { WhatsAppProviderId } from "./whatsapp/types";

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
  // Provider-agnostic billing identifiers (Grow / Stripe). The legacy
  // stripe_* columns are retained for backward compatibility.
  payment_provider: PaymentProviderId | null;
  payment_customer_id: string | null;
  payment_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  pack_balance: number;
  // Cancel-at-period-end: service stays on until subscription_ends_at.
  cancel_at_period_end?: boolean;
  subscription_ends_at?: string | null;
  // Admin / security
  totp_enabled?: boolean;
  totp_secret?: string | null; // encrypted; server-only, never sent to client
  is_suspended?: boolean;
  last_login_at?: string | null;
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
  // WhatsApp connection (multi-tenant isolation) — each tenant owns its WABA.
  wa_provider: WhatsAppProviderId | null;
  meta_business_id: string | null;
  meta_waba_id: string | null;
  meta_phone_number_id: string | null;
  wa_access_token: string | null;
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
  provider_message_id: string | null;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  bot_id: string;
  period: string; // "2026-06"
  message_count: number;
}

// ── AI agent layer ────────────────────────────────────────────

/** Registered operational/product agents (see lib/agents/registry.ts). */
export type AgentName =
  | "conversation-analyst"
  | "retention"
  | "knowledge"
  | "orchestrator";

export type AgentMode = "dry" | "live";
export type AgentStatus = "success" | "error" | "skipped";
export type ProposedActionStatus = "pending" | "approved" | "applied" | "dismissed";

/**
 * A single side-effecting action an agent proposes. In `dry` mode it is
 * stored for human approval; in `live` mode an executed action is recorded
 * with status `applied`. `type` is agent-specific (e.g. "prompt_improvement",
 * "retention_offer").
 */
export interface ProposedAction {
  type: string;
  target?: string; // bot_id / user_id / conversation_id the action applies to
  label: string; // Hebrew human-readable description
  payload: Record<string, unknown>;
  status: ProposedActionStatus;
}

export interface AgentRun {
  id: string;
  agent: AgentName;
  status: AgentStatus;
  mode: AgentMode;
  user_id: string | null;
  bot_id: string | null;
  period: string | null;
  dedup_key: string | null;
  summary: string | null;
  proposed_actions: ProposedAction[];
  output: Record<string, unknown> | null;
  error: string | null;
  tokens: number;
  created_at: string;
}

/** What every agent's `run()` returns to the runner before persistence. */
export interface AgentResult {
  summary: string; // one-line Hebrew summary for the owner report
  proposedActions: ProposedAction[];
  output?: Record<string, unknown>;
  tokens?: number;
  /** Per-run idempotency key; when set, a matching prior run short-circuits. */
  dedupKey?: string;
  /** Optional tenant/bot scoping for the persisted row. */
  userId?: string | null;
  botId?: string | null;
}
