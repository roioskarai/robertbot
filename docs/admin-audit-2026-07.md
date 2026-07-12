# Admin Panel — Final Audit (2026-07-12)

Status of the "FINAL SaaS ADMIN PANEL COMMAND CENTER" brief. Most of the brief
was already delivered in the 8-batch enterprise upgrade (2026-07-11). This pass
added only the genuinely-missing pieces and consolidated the navigation, per the
owner's decisions: build only the new + polish, six nav groups, simple+smart
maintenance mode. Payment provider = Grow.

## Already existed — not rebuilt
- User management + profile edit + delete + password reset + **timeline**.
- Subscription center: change plan, extend/shorten (days), trial→paid, cancel
  (immediate / period-end), pause, restore, comp grant/revoke — each with a
  before→after preview and confirmation.
- Global admin **audit log** (`admin_audit_log`) wired into every sensitive write.
- Smart alerts panel + notification bell; **command palette** (Ctrl/⌘+K).
- **AI assistant** (predefined safe queries only) + weekly strategic report.
- Website design center: draft→publish, code-defined `DEFAULT_SETTINGS` /
  `DEFAULT_THEME`, page **versions** + restore, full backup/rollback export,
  themes, branding/layout/content, custom code.
- Admin auth: password + TOTP 2FA; role/permission matrix (`lib/site/roles`).

## Added this pass
| Area | What | Files |
|---|---|---|
| Maintenance Mode | Toggle + message + ETA; public `/maintenance`; admin/bots/APIs/cron never blocked | `lib/system-settings.ts`, `api/admin/system/maintenance`, `app/maintenance`, guards on public pages |
| Feature Flags | Code-defined registry + admin toggles; 3 real flags wired (assistant, weekly report, pack sales) | `lib/feature-flags.ts`, `api/admin/system/flags`, `FeatureFlagsCard` |
| Nav | Six groups (Dashboard/Users/Billing/AI&Bots/Security/System+Site); palette updated | `AdminShell.tsx`, `lib/admin-nav-core.ts`, `CommandPalette.tsx` |
| Polish | One-click "restore to default" for site settings (draft; code preserved) | `api/admin/site/settings/restore-defaults`, marketing page |
| DB | `system_settings` key-value table (admin-read RLS, service-role writes) | migration `0013_system_settings.sql` |

## Security posture of the new surfaces
- `system_settings`: RLS `SELECT is_admin()`, **no write policy**, `REVOKE` write
  from `authenticated`/`anon` — same posture as `payment_events` and the 0012
  hardening. Every write goes through the service-role admin client after
  `requireAdmin()` / `requirePermission()` and is recorded in the admin audit log.
- Feature-flag toggle rejects any key not in the code registry.
- Maintenance guard runs only on customer pages (home, pricing, templates, legal,
  dashboard, onboarding); `/admin`, `/api`, `/login`, `/admin/login` are never
  gated, so admin login, bots, webhooks and cron keep working during maintenance.
- All new config feature-detects the table (`isMissingTableError`) → safe defaults
  (maintenance OFF, flags at code defaults) before migration 0013 is applied.

## Verification
`tsc` 0 · `lint` 0 errors (41 pre-existing warnings) · `build` OK · `vitest` 189 ·
`e2e` 18. Commits `09ce630` (A) · `a7e863b` (B) · `9e1ab01` (C).

## Deliberately out of scope (non-blocking)
- **M3 — rate limiting is in-memory** (per serverless instance). Weak against
  brute-force across instances. Needs an infra decision: Upstash Redis (free tier)
  or a Supabase-backed limiter. Not half-built — awaiting owner decision.
- **H2 — Stripe cancellation mapping**: not relevant; the active provider is Grow.
- **L2 — `numbersMatch` last-9-digit compare** in the WhatsApp webhook: low risk,
  mitigated by the unique index on `whatsapp_number`; changing inbound routing is
  riskier than the theoretical issue.

## Pending owner approvals to release
1. `APPROVED - DATABASE` — apply migration `0013_system_settings.sql`.
2. `APPROVED FOR PRODUCTION DEPLOYMENT` — deploy. All code works before the
   migration (safe defaults), so deploy order is flexible.
