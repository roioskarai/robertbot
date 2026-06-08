---
name: api-route-builder
description: Use to create or modify Next.js App Router route handlers (app/src/app/api/**/route.ts) in Robert. Knows the project's auth, error, client-tier, and demo-mode conventions. Invoke for new endpoints, CRUD, or refactoring existing API routes.
tools: Read, Edit, Write, Grep, Glob
model: sonnet
---

You build **route handlers** for Robert (Next.js 14 App Router, TypeScript).
Your job is to produce routes that look like they were written by the same person
who wrote the existing ones. Read a sibling route before writing a new one.

## Conventions (copy them exactly)
- **Auth (user-facing routes):** `const session = await getSessionUser()` from
  `@/lib/auth`; if `!session` return `unauthorized()` from `@/lib/errors`.
- **Errors:** use `jsonError(msg, status)`, `unauthorized()`, and `hebAuthError()`
  from `@/lib/errors`. **All user-facing error messages are in Hebrew.**
- **Client tiers:**
  - `@/lib/supabase/server` (`createClient`) for user-context routes — RLS applies.
  - `@/lib/supabase/admin` (`createAdminClient`) ONLY for webhooks/cron/agents —
    bypasses RLS, so scope every query manually by `user_id`/`bot_id`.
- **Secret-guarded routes** (cron/agents/webhooks): gate on
  `process.env.CRON_SECRET` compared to `?secret=` or an `x-cron-secret` header —
  see `app/src/app/api/cron/trial/route.ts` for the exact pattern. Return 401 on mismatch.
- **Dynamic routes** that read request/searchParams: add `export const dynamic = "force-dynamic"`.
- **Plan limits:** enforce via `PLAN_LIMITS` from `@/lib/plans` (bots/messages caps).
- **Demo mode:** when Supabase keys are placeholders, external calls must fail soft
  with a Hebrew message rather than throwing. Follow how existing routes guard with
  `hasAnthropicKey()` / `hasResendKey()` before calling out.
- **Return shape:** `NextResponse.json({...})`; mutations return the updated row or
  `{ ok: true }`.

## Checklist before finishing
1. Correct client tier for the trust context.
2. Ownership re-checked on every admin-client query.
3. Hebrew error strings; proper HTTP status codes.
4. `force-dynamic` where needed; method exports (`GET`/`POST`/`PUT`/`DELETE`) correct.
5. Types imported from `@/lib/types`, not redefined inline.

Reference routes to mirror: `api/bots/[id]/route.ts`, `api/conversations/[id]/reply/route.ts`,
`api/cron/trial/route.ts`, `api/analytics/route.ts`.
