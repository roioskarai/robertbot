# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (runs tsc + eslint + next build)
npm run lint         # ESLint check
npx tsc --noEmit     # Type-check only (faster than full build)
```

Node.js is at `%ProgramFiles%\nodejs\`. If `npm` is not on PATH, refresh it:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## Architecture

### Styling: CSS Modules with preserved original class names

Every page has its own `.module.css` that copies the design verbatim from the corresponding `../robert-*.html` file (the locked source of truth). **Do not change visual design** — the CSS is intentionally duplicated, not refactored.

The `scoped()` helper in `src/lib/cx.ts` maps space-separated original class names to their CSS-module equivalents:
```ts
const c = scoped(styles);
<div className={c("plan pop rv")} />   // maps each token through styles[]
```

Shared tokens (`:root` vars, RTL, Rubik font) live in `src/app/globals.css`. Each page re-declares its own color variants in its module to avoid cross-page leakage.

### Data model: 4-tier plans

Plans: `basic` (₪99) · `pro` (₪199) · `business` (₪399) · `enterprise` (₪699).  
Source of truth: `src/lib/plans.ts` — `PLAN_LIMITS`, `PRICING`, `MESSAGE_PACKS`, helpers.  
`PricingPlans` component (`src/components/PricingPlans.tsx`) renders the plan grid everywhere (landing, `/pricing`, dashboard billing + store tabs). Pass `onSelect` to make CTAs call Stripe checkout instead of linking to `/onboarding`.

### Authentication & database

- `src/lib/supabase/client.ts` — browser client (Client Components)
- `src/lib/supabase/server.ts` — server client (Server Components / Route Handlers)
- `src/lib/supabase/admin.ts` — service-role client (webhooks, cron — bypasses RLS)
- `src/lib/auth.ts` — `getSessionUser()` returns auth user + `users` profile row
- `src/middleware.ts` — session refresh + guards `/dashboard` and `/preview`. In demo mode (placeholder Supabase URL) the guard is bypassed so pages render with fallback data.
- Schema + RLS + triggers: `supabase/schema.sql` — run once in Supabase SQL editor.

### AI engine

`src/lib/claude.ts` owns the complete bot logic:
- `buildSystemPrompt(bot)` — constructs the system prompt from a `Bot` row (Hebrew-first, style, services, FAQ, working hours, handoff + button format rules)
- `generateReply(bot, history, message)` — calls Claude API, returns `BotReply { text, buttons, handoff }`
- `parseBotReply(raw)` — strips `[BUTTONS: a|b|c]` and `[HANDOFF]` tokens

### Key flows

**WhatsApp message → reply** (`/api/webhook/whatsapp`):
1. Validate Twilio signature → find bot by `whatsapp_number` → dedup by `twilio_message_sid`
2. Rate-limit per bot (`src/lib/rate-limit.ts`, in-memory)
3. Check quota: plan monthly limit first, then `pack_balance` (never expires)
4. Load last 10 messages → `generateReply()` → send back via Twilio → persist + increment usage

**Stripe billing** (`/api/webhook/stripe`):  
`checkout.session.completed` → update plan/subscription or credit `pack_balance`.  
`customer.subscription.deleted` → set `subscription_status = 'cancelled'`, deactivate bots.

**Trial cron** (`/api/cron/trial?secret=...`):  
Day 5 — send Resend trial-ending email; Day 7+ — deactivate bots for unpaid users.

**Onboarding "new bot" shortcut**:  
Dashboard buttons pass `?new=1` → `/onboarding` detects this with `useSearchParams()` and skips the signup screen straight to the wizard.

### Demo mode

All pages render with hardcoded fallback data when Supabase keys are placeholders (`.env.local` contains `placeholder`). The middleware detects this and skips auth. External calls (Stripe, Twilio, Resend) return Hebrew error messages instead of crashing. Only `ANTHROPIC_API_KEY` is needed to make the AI engine and `/preview` work end-to-end.

### API routes reference

| Prefix | Purpose |
|---|---|
| `/api/auth/*` | signup · verify · login · logout |
| `/api/bots/*` | CRUD + connect/disconnect/activate/preview |
| `/api/conversations/*` | list · get+messages · reply · return |
| `/api/analytics` | aggregated stats for dashboard |
| `/api/billing/*` | checkout · portal · cancel · pause · downgrade |
| `/api/webhook/whatsapp` | Twilio inbound (AI engine entry point) |
| `/api/webhook/stripe` | Stripe payment events |
| `/api/cron/trial` | daily trial expiry (call with `?secret=CRON_SECRET`) |
