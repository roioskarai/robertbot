# Robert — WhatsApp Bot SaaS Platform
## Claude Code Master Prompt

---

## PROJECT OVERVIEW

You are building **Robert** — a SaaS platform that allows small business owners in Israel to create, configure, and deploy AI-powered WhatsApp bots for their businesses. Think of it as "Shopify for WhatsApp bots."

**Business Model:**
- Monthly/Annual subscription: ₪99 / ₪199 / ₪349 per month
- 7-day free trial (no credit card required)
- Multi-tenant: each customer manages their own bots independently
- The platform owner (admin) has full visibility over all tenants

**Target Market:** Israeli small businesses — hair salons, restaurants, professionals, clinics, retail stores

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Hosting | Vercel |
| Payments | Stripe (Checkout + Webhooks + Subscriptions) |
| WhatsApp | Twilio WhatsApp Business API |
| AI Engine | Anthropic Claude API (claude-sonnet-4-20250514) |
| Email | Resend |
| Language | TypeScript throughout |

---

## EXISTING DESIGN FILES

I have pre-built HTML/CSS files for all pages. Your job is to:
1. Convert them into Next.js components
2. Wire them to real backend logic
3. Do NOT redesign anything — use the existing styles exactly

**Files provided:**
- `robert-landing.html` — Public landing page
- `robert-onboarding.html` — Signup + 5-step bot configuration wizard
- `robert-dashboard.html` — Customer dashboard (8 tabs)
- `robert-preview.html` — Live bot simulator
- `robert-bot-templates.html` — Message template selector
- `robert-emails.html` — Email templates (welcome, OTP, renewal)
- `robert-cancel.html` — Smart cancellation retention flow
- `robert-legal.html` — Terms of service + Privacy policy
- `robert-404.html` — Error page
- `favicon.svg` — Brand favicon

---

## DATABASE SCHEMA (Supabase)

```sql
-- Users / Tenants
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'tenant' CHECK (role IN ('admin', 'tenant')),
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'advanced', 'pro')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'paused')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bots
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- Business name: "מספרת מיטל"
  bot_name TEXT NOT NULL,          -- Bot display name in WhatsApp: "מיטל"
  business_type TEXT,              -- Category: "beauty", "food", etc.
  business_subtype TEXT,           -- Subcategory: "ספר / מספרה"
  description TEXT,                -- Business description for AI context
  services JSONB DEFAULT '[]',     -- [{name, price}]
  working_hours JSONB,             -- {sun:{open,close,closed}, mon:...}
  address TEXT,
  phone TEXT,
  style TEXT DEFAULT 'friendly' CHECK (style IN ('friendly', 'professional', 'short')),
  whatsapp_number TEXT,
  twilio_sid TEXT,
  active BOOLEAN DEFAULT false,
  system_prompt TEXT,              -- Generated AI system prompt
  message_templates JSONB,         -- Custom templates chosen by tenant
  faq JSONB DEFAULT '[]',          -- [{question, answer}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status TEXT DEFAULT 'bot' CHECK (status IN ('bot', 'human', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  from_type TEXT CHECK (from_type IN ('customer', 'bot', 'human')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message count for billing
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  bot_id UUID REFERENCES bots(id),
  period TEXT,    -- "2026-06"
  message_count INT DEFAULT 0
);
```

**Row Level Security (CRITICAL):**
```sql
-- Tenants can ONLY see their own data
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own_bots" ON bots
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own_conversations" ON conversations
  FOR ALL USING (
    bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid())
  );

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own_messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN bots b ON c.bot_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- Admin can see everything
CREATE POLICY "admin_all_access" ON bots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## PLAN LIMITS

```typescript
export const PLAN_LIMITS = {
  basic:    { bots: 1, messages: 300,    features: ['basic_qa', 'whatsapp'] },
  advanced: { bots: 3, messages: 1000,   features: ['basic_qa', 'whatsapp', 'handoff', 'analytics'] },
  pro:      { bots: 5, messages: 2500,   features: ['basic_qa', 'whatsapp', 'handoff', 'analytics', 'advanced_ai', 'priority_support'] },
} as const;

export const PRICING = {
  basic:    { monthly: 99,  annual: 79  },
  advanced: { monthly: 199, annual: 159 },
  pro:      { monthly: 349, annual: 279 },
} as const;

// Message Packs — one-time purchases, never expire
// Pack is consumed AFTER monthly quota is exhausted
// On renewal: monthly quota resets first, pack balance carries over
export const MESSAGE_PACKS = [
  { id: 'starter', name: 'Starter', messages: 200,  price: 19 },
  { id: 'regular', name: 'Regular', messages: 500,  price: 39 },
  { id: 'large',   name: 'Large',   messages: 1000, price: 69 },
  { id: 'xl',      name: 'XL',      messages: 3000, price: 179 },
] as const;
```

---

## AI BOT ENGINE

The core feature. When a WhatsApp message arrives:

```typescript
// 1. Twilio webhook receives message
// POST /api/webhook/whatsapp

// 2. Find the bot by WhatsApp number
// 3. Load conversation history (last 10 messages)
// 4. Build dynamic system prompt from bot config
// 5. Call Claude API
// 6. Send response back via Twilio
// 7. Save to DB

async function buildSystemPrompt(bot: Bot): Promise<string> {
  return `
You are ${bot.bot_name}, the virtual assistant for ${bot.name}.

BUSINESS INFO:
${bot.description}

SERVICES & PRICING:
${bot.services.map(s => `- ${s.name}: ₪${s.price}`).join('\n')}

WORKING HOURS:
${formatWorkingHours(bot.working_hours)}

ADDRESS: ${bot.address}

COMMUNICATION STYLE: ${bot.style === 'friendly' ? 
  'Warm, friendly, use emojis occasionally' : 
  bot.style === 'professional' ? 
  'Professional and formal, no emojis' : 
  'Short and to the point'}

LANGUAGE: Always respond in Hebrew (עברית) unless the customer writes in another language.

RULES:
1. Always offer quick-reply buttons when possible (format: [BUTTONS: option1 | option2 | option3])
2. For appointment booking: first ask service → then offer 5 available dates → then show available times for chosen date
3. If you cannot answer a question, transfer to human: [HANDOFF]
4. Never make up prices or services not listed above
5. Keep responses concise — mobile users don't like long texts
6. After 2 failed attempts to understand, trigger [HANDOFF]

FAQ:
${bot.faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}
  `.trim();
}
```

---

## KEY API ROUTES

```
POST   /api/webhook/whatsapp          — Twilio incoming message webhook
POST   /api/webhook/stripe            — Stripe payment events

POST   /api/auth/signup               — Create account
POST   /api/auth/verify               — Verify email OTP

GET    /api/bots                      — List user's bots
POST   /api/bots                      — Create new bot
GET    /api/bots/[id]                 — Get bot details
PUT    /api/bots/[id]                 — Update bot
DELETE /api/bots/[id]                 — Delete bot
POST   /api/bots/[id]/connect         — Connect WhatsApp number
POST   /api/bots/[id]/disconnect      — Disconnect WhatsApp number
POST   /api/bots/[id]/activate        — Go live
POST   /api/bots/[id]/preview         — Test bot response (simulation)

GET    /api/conversations             — List conversations
GET    /api/conversations/[id]        — Get conversation + messages
POST   /api/conversations/[id]/reply  — Human reply in conversation
POST   /api/conversations/[id]/return — Return conversation to bot

GET    /api/analytics                 — Usage stats for dashboard
GET    /api/billing/portal            — Stripe customer portal URL
POST   /api/billing/cancel            — Cancel subscription
POST   /api/billing/pause             — Pause subscription
POST   /api/billing/downgrade         — Change plan
```

---

## ONBOARDING FLOW (5 steps)

After signup, the user is guided through:

1. **Business Type** — Category + subcategory selection (hierarchical grid)
2. **Business Details** — Name, bot name, description, address, phone, working hours
3. **Services** — Add services with prices + FAQ
4. **Style** — Choose bot communication style (friendly / professional / short)
5. **WhatsApp** — Connect phone number via Twilio verification

After completion → **Preview simulator** → "Go Live" button → Dashboard

---

## SUBSCRIPTION & TRIAL

```typescript
// Trial logic
- 7 days free, no credit card required
- Day 5: Send "trial ending soon" email
- Day 7: Bot deactivated if no payment
- Stripe Checkout triggered on plan selection

// Billing cycles
// Store access rules (CRITICAL):
// - Message Packs: available ONLY to active paying subscribers
// - Plan upgrade/downgrade: available to any logged-in user
// - Non-subscriber clicking "Buy Pack" → redirect to /signup
// - Non-subscriber in dashboard store tab → show packs (view only) + "subscribers only" warning
// - Pack consumed AFTER monthly quota. Pack never expires, carries over month to month.

- Monthly: charged on subscription start date each month
- Annual: charged upfront, 14-day refund window

// Cancellation
- Monthly: effective end of billing period
- Annual: no refund after 14 days
- On cancel: bot stays active until period end, then deactivated
- User data retained 30 days, then deleted
```

---

## MULTI-TENANCY RULES

```
ADMIN (you):
  ✅ See all tenants, all bots, all conversations
  ✅ Change plan limits
  ✅ Modify default message templates
  ✅ Access analytics across all tenants
  ❌ Cannot modify individual tenant bot content

TENANT (your customer):
  ✅ Manage their own bots (within plan limits)
  ✅ Edit bot name, services, hours, style, templates
  ✅ View their own conversations and analytics
  ✅ Upgrade/downgrade/cancel their plan
  ❌ Cannot see other tenants' data (RLS enforced)
  ❌ Cannot exceed plan bot/message limits
  ❌ Cannot modify system-level settings
```

---

## BUILD ORDER

Build in this exact sequence — each step must work before moving to the next:

1. **Next.js + Supabase setup** — Auth, DB schema, RLS policies
2. **Landing page** — Convert HTML to Next.js, wire signup CTA
3. **Auth flow** — Signup, email OTP verification, login
4. **Stripe integration** — Checkout, webhooks, trial management
5. **Onboarding wizard** — 5 steps, save bot to DB
6. **Dashboard** — All 8 tabs with real data
7. **Twilio webhook** — Receive WhatsApp messages
8. **AI engine** — Claude API integration, system prompt builder
9. **Bot preview** — Test bot before going live
10. **Notifications** — Email via Resend (welcome, trial end, renewal)

---

## ENVIRONMENT VARIABLES NEEDED

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

ANTHROPIC_API_KEY=

RESEND_API_KEY=

NEXT_PUBLIC_APP_URL=https://robertbot.co.il
```

---

## IMPORTANT NOTES

- **Hebrew RTL**: All UI is RTL direction. Keep `dir="rtl"` on all pages.
- **Landing page nav**: Two buttons — "כניסה" (login, outlined) and "הרשמה חינם" (signup, green filled)
- **Store/Pricing**: Single unified tab with sub-tabs for Plans and Packs. Packs gated behind active subscription check.
- **Mobile First**: Most users access via mobile. Test everything on 375px width.
- **WhatsApp Formatting**: Claude responses should use WhatsApp markdown (*bold*, _italic_) and quick-reply button format `[BUTTONS: opt1 | opt2]`
- **Rate Limiting**: Implement per-bot message rate limiting to prevent abuse
- **Error Handling**: All API routes must return proper Hebrew error messages
- **Idempotency**: Twilio may send duplicate webhooks — handle with message deduplication

---

## START HERE

Begin with:

```bash
npx create-next-app@latest robert --typescript --tailwind --app --src-dir
cd robert
npm install @supabase/supabase-js @supabase/ssr stripe twilio @anthropic-ai/sdk resend
```

Then:
1. Set up Supabase project and run the DB schema above
2. Configure environment variables
3. Implement Supabase Auth with email + Google provider
4. Create the middleware for route protection

Let's build this step by step. Start with step 1.
