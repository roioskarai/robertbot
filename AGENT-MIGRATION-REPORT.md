# Agent Migration Report — 20 → 7 AI Operating System

**Date:** 2026-06-24 · **Type:** architectural migration of `.claude/agents/` (documentation/agent-definition only — no `app/` code changed).

The agent roster was consolidated from an apex + 3-layer structure (20 agents) into a
**7-agent AI Operating System**: 1 CEO/orchestrator (Layer 1) + 6 domain owners (Layer 2),
with clear, non-overlapping ownership and a formal approval-gate governance.

This report is also the **legend** for the old→new names that intentionally remain in the
historical `bug-audit/*.md` reports (kept as a point-in-time record, by owner decision).

---

## The 7 new agents
| Agent | Layer | Owns |
|---|---|---|
| `project-director` | 1 | Single CEO/orchestrator: planning, prioritization, delegation, coordination, risk, final decisions, approval enforcement, strategy |
| `product-engineering` | 2 | Frontend, Backend, APIs, DB (schema/RLS/migrations), integrations, bot AI behavior, runtime AI agents & automations, CMS code, infrastructure |
| `security` | 2 | App/infra/cloud/AI security, multi-tenant isolation review, secret & dependency scanning, RLS correctness, legal/privacy & compliance |
| `qa-operations` | 2 | QA/functional/UI/UX testing, build & runtime verification, release-readiness score, monitoring/reliability — **report-only** (fixes → product-engineering; deploy executed by owner) |
| `growth` | 2 | Marketing, SEO, content, sales enablement, customer support, funnel optimization, competitor analysis, data/KPIs, revenue analysis |
| `brand-design` | 2 | Brand identity, voice & tone, design system, UI design, creative direction, landing-page design, ad assets, AI visual prompts |
| `admin-platform-manager` | 2 | Admin panel only: admin security, permissions/roles, settings, internal dashboards/tools, user management, subscription administration, admin workflows |

---

## Old → New mapping + knowledge migrated + validation

| Old Agent | New Agent | Knowledge Migrated | Status |
|---|---|---|---|
| marketing-strategist | growth | Campaign/social/ads workflow, "ask first", natural Hebrew, benefit-before-feature, CTA discipline, copy-paste output, proposes-not-publishes | ✅ |
| content-seo | growth | Keyword research, H1/H2 + FAQ-schema structure, meta title/desc/slug, email subject/preview/body | ✅ |
| competitor-scout | growth | Real WebSearch/WebFetch/Playwright research, certain-vs-estimate marking, comparison table + opportunities/threats + sources | ✅ |
| sales-closer | growth | Benefit-selling, 7-day-trial as lead, objection handling, tier recommendations, "what customer says → why → answer" format | ✅ |
| customer-support | growth | Read-code-before-answering, empathetic numbered steps, FAQ/canned responses, escalate true bugs → qa-operations | ✅ |
| data-analyst | growth | WHAT-to-collect + interpretation, segmentation, SaaS KPIs (activation/MRR/churn/TTV/trial→paid), minimum-necessary privacy, `mcp__supabase` | ✅ |
| finance-billing | growth **+** admin-platform-manager | Revenue/MRR/churn/unit-economics + revenue-leak audits → **growth**; subscription administration (change plan/quota/pack from admin) → **admin-platform-manager** | ✅ |
| brand-guardian | brand-design | Brand promise, full light/dark color palette, Rubik/RTL, voice & tone, ✅/⚠️ "like this / not like this" review, visual ground truth | ✅ |
| creative-studio | brand-design | Ready-to-paste English prompts (Sora/Veo/Runway/Kling + Midjourney/DALL·E/Ideogram/Leonardo), Subject+Action+Setting+Style+Camera+Technical+Negative, storyboard table | ✅ |
| cyber-guardian | security | Secret scan, `npm audit`, tenant-isolation scanning, webhook-auth checks, data-protection/privacy hardening, incident-response playbook, human-expert disclaimer | ✅ |
| legal-privacy | security | Israeli Privacy Law + GDPR drafting/review, processor relationships, consent/retention, ✅/⚠️ format, "not legal advice" + "points requiring attorney review" | ✅ |
| multitenant-security-reviewer | security | Full 6-category threat checklist (tenant isolation, endpoint auth, webhook integrity, billing/quota, secrets/PII, input handling), diff-focused, severity + `file:line` + exploit + minimal fix | ✅ |
| strategy-advisor | project-director | Strategy, prioritization by impact/effort, go-to-market, growth plans, fundraising prep, respectful pushback, "what NOT to do", 4-part recommendation format | ✅ |
| site-keeper | qa-operations | Bug triage/root-cause, performance & uptime/monitoring, dependency-upkeep assessment, plain-Hebrew reporting, respect locked design. (Role later refined to **report-only**: code/perf/dependency fixes → product-engineering; deploy executed by owner.) | ✅ |
| supabase-architect | product-engineering **+** security | Migration/RLS/index **implementation** + `types.ts` sync + JSONB patterns → **product-engineering**; RLS-policy **correctness review** → **security** | ✅ |
| api-route-builder | product-engineering | Route conventions: auth (`getSessionUser`/`unauthorized`), Hebrew errors, client-tier discipline, `CRON_SECRET` gating, `force-dynamic`, `PLAN_LIMITS`, demo fail-soft, 7-point checklist | ✅ |
| integrations-engineer | product-engineering | Twilio/Stripe/Resend/Anthropic; webhook signature verification, idempotency (`twilio_message_sid`/event id), quota→pack order, rate-limit, secrets server-side | ✅ |
| bot-prompt-engineer | product-engineering | `buildSystemPrompt`/`parseBotReply`, `[BUTTONS]`/`[HANDOFF]` token contract, grounding-over-fluency, RTL/Hebrew, deterministic booking flow, structured-output JSON rules | ✅ |
| qa-verifier | qa-operations | Verification ladder (`tsc`→`lint`→`build`), Windows PATH note, demo-mode sanity, test priorities (`parseBotReply`/quota/plan-limits/agent shape), ✅/❌ verdict | ✅ |

**Runtime ops agents** (`conversation-analyst`, `retention`, `knowledge`, `orchestrator`,
`runner`, `registry` in `app/src/lib/agents/`) are **not retired** — they are code, now
explicitly owned by `product-engineering`.

---

## New governance: approval gates
No deployment, database modification, destructive action, or production change proceeds
without the owner typing the exact phrase:
- `APPROVED FOR PRODUCTION DEPLOYMENT` — deploy/release to production
- `APPROVED - DATABASE` — schema/data modification (migrations, `mcp__supabase` writes)
- `APPROVED - PRODUCTION` — any other production-affecting change

Enforced by `project-director`; respected by all executor agents. Added to root `CLAUDE.md`
(operating rule #4) and to each relevant agent's boundaries.

---

## Validation checklist
1. **New agents exist** — ✅ 7 files in `.claude/agents/` (project-director, product-engineering, security, qa-operations, growth, brand-design, admin-platform-manager).
2. **Old agents removed** — ✅ all 19 retired files deleted (git history preserves them).
3. **No responsibility gaps** — ✅ every retired agent's responsibilities mapped above; runtime ops agents owned by product-engineering.
4. **No duplicate responsibilities** — ✅ security audit only in `security`; verification/site-ops only in `qa-operations`; CMS split (code=product-engineering, tool=admin-platform-manager, public output=brand-design+growth).
5. **All references updated** — ✅ `CLAUDE.md`, `app/CLAUDE.md`, `PROJECT-PLAN.md`, and the 8 skills updated. Old names remain only in `bug-audit/*.md` (intentional historical record) and this report.
6. **All documentation updated** — ✅ rosters, MCP table, workflow, and skill "Pairs with" clauses reflect the 7.
7. **All delegation chains updated** — ✅ project-director roster + new agents' cross-references point only to the 7.

**Migration complete:** all capabilities preserved, ownership clear.
