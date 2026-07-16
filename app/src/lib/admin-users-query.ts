import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

// Shared query builder for the admin Users list, counters, and CSV export, so
// the three can never drift apart. Filters map onto EXISTING columns only —
// no schema change. See app/supabase/schema.sql users table.

type Db = ReturnType<typeof createAdminClient>;

export type UserFilterKey =
  | "all" | "trial" | "trial_expired" | "active_paying"
  | "comp" | "cancelled" | "paused" | "inactive"
  | "bot_no_number" | "no_bot";

export const USER_FILTER_KEYS: UserFilterKey[] = [
  "all", "trial", "trial_expired", "active_paying", "comp", "cancelled", "paused", "inactive",
  "bot_no_number", "no_bot",
];

/** Filters that need a cross-table lookup against `bots` (resolved to an id set). */
export const BOT_SEGMENT_KEYS: UserFilterKey[] = ["bot_no_number", "no_bot"];

const SORT_COLUMNS = ["created_at", "last_login_at", "trial_ends_at"] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];

export interface UserQuery {
  filter: UserFilterKey;
  plan: string | null;   // sub-filter for active_paying (basic|pro|business|enterprise)
  q: string;             // sanitized free-text (email or full_name)
  sort: SortColumn;
  dir: "asc" | "desc";
  inactiveDays: number;
  /** Pre-resolved user-id set for a BOT_SEGMENT_KEYS filter (see resolveBotSegment). */
  segmentIds: string[] | null;
}

export const USER_SELECT =
  "id, email, full_name, role, plan, billing_cycle, subscription_status, pack_balance, is_suspended, totp_enabled, trial_ends_at, last_login_at, created_at, subscription_ends_at, cancel_at_period_end, is_comp, comp_note";

/**
 * Strip characters that would break a PostgREST `.or()` filter grammar
 * (commas, parentheses, wildcards, backslashes) before we interpolate the
 * free-text search into `email.ilike.%q%,full_name.ilike.%q%`.
 */
export function sanitizeSearch(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/[,()%*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function parseUserQuery(sp: URLSearchParams): UserQuery {
  const rawFilter = sp.get("filter") as UserFilterKey | null;
  const filter: UserFilterKey =
    rawFilter && USER_FILTER_KEYS.includes(rawFilter) ? rawFilter : "all";

  // Back-compat: the old ?status=&comp=1 params still work as filters.
  const legacyStatus = sp.get("status");
  const legacyComp = sp.get("comp") === "1";
  const resolvedFilter: UserFilterKey =
    filter !== "all"
      ? filter
      : legacyComp
        ? "comp"
        : legacyStatus && ["trial", "active", "cancelled", "paused"].includes(legacyStatus)
          ? (legacyStatus === "active" ? "active_paying" : (legacyStatus as UserFilterKey))
          : "all";

  const rawSort = sp.get("sort") as SortColumn | null;
  const sort: SortColumn = rawSort && SORT_COLUMNS.includes(rawSort) ? rawSort : "created_at";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";
  const inactiveDaysRaw = parseInt(sp.get("inactiveDays") ?? "30", 10);
  const inactiveDays = Number.isFinite(inactiveDaysRaw) ? Math.min(365, Math.max(1, inactiveDaysRaw)) : 30;

  return {
    filter: resolvedFilter,
    plan: sp.get("plan"),
    q: sanitizeSearch(sp.get("q")),
    sort,
    dir,
    inactiveDays,
    segmentIds: null,
  };
}

/**
 * Resolve the user-id set for a cross-table bot segment. Small tables (admin
 * scale) so we read them whole and intersect in JS. Returns null for filters
 * that don't need it, so the caller only pays for bot queries when relevant.
 *  - bot_no_number: users who created ≥1 bot but connected NONE of them.
 *  - no_bot: users with zero bots at all.
 */
export async function resolveBotSegment(db: Db, filter: UserFilterKey): Promise<string[] | null> {
  if (!BOT_SEGMENT_KEYS.includes(filter)) return null;
  const { data: bots } = await db.from("bots").select("user_id, whatsapp_number, meta_phone_number_id");
  const hasBot = new Set<string>();
  const hasConnected = new Set<string>();
  for (const b of bots ?? []) {
    if (!b.user_id) continue;
    hasBot.add(b.user_id);
    if (b.whatsapp_number || b.meta_phone_number_id) hasConnected.add(b.user_id);
  }
  if (filter === "bot_no_number") {
    return [...hasBot].filter((id) => !hasConnected.has(id));
  }
  // no_bot — every user not present in the bots table.
  const { data: allUsers } = await db.from("users").select("id");
  return (allUsers ?? []).map((u) => u.id).filter((id) => !hasBot.has(id));
}

/**
 * Apply only the category filter (no search / order) — shared by list +
 * counters. Typed `any` on purpose: the concrete PostgREST filter-builder type
 * is deeply recursive and makes a generic here trip TS2589 ("excessively deep").
 * This is internal query plumbing; the public functions below stay typed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(query: any, f: UserQuery): any {
  const now = new Date().toISOString();
  switch (f.filter) {
    case "trial":
      return query.eq("subscription_status", "trial").gte("trial_ends_at", now);
    case "trial_expired":
      return query.eq("subscription_status", "trial").lt("trial_ends_at", now);
    case "active_paying": {
      let q = query.eq("subscription_status", "active").eq("is_comp", false);
      if (f.plan && ["basic", "pro", "business", "enterprise"].includes(f.plan)) q = q.eq("plan", f.plan);
      return q;
    }
    case "comp":
      return query.eq("is_comp", true);
    case "cancelled":
      return query.eq("subscription_status", "cancelled");
    case "paused":
      return query.eq("subscription_status", "paused");
    case "inactive": {
      const cutoff = new Date(Date.now() - f.inactiveDays * 86_400_000).toISOString();
      return query.or(`last_login_at.is.null,last_login_at.lt.${cutoff}`);
    }
    case "bot_no_number":
    case "no_bot":
      // Constrain to the pre-resolved id set. Empty set → matches nothing.
      return query.in("id", f.segmentIds ?? []);
    default:
      return query;
  }
}

/** Full list query: filter + free-text search + sort + 500 cap. */
export function buildUserListQuery(db: Db, f: UserQuery) {
  let query = applyFilter(db.from("users").select(USER_SELECT), f);
  if (f.q) query = query.or(`email.ilike.%${f.q}%,full_name.ilike.%${f.q}%`);
  return query.order(f.sort, { ascending: f.dir === "asc" }).limit(500) as ReturnType<typeof buildUserListQueryRaw>;
}
// Helper only to recover the awaited { data, error } shape for callers.
function buildUserListQueryRaw(db: Db) {
  return db.from("users").select(USER_SELECT).limit(1);
}

/** Per-category counts (head-only). Ignores free-text so the chips are stable totals. */
export async function countUsersByFilter(db: Db, inactiveDays = 30): Promise<Record<UserFilterKey, number>> {
  const entries = await Promise.all(
    USER_FILTER_KEYS.map(async (key) => {
      // Bot segments are defined purely by their resolved id set — the count is
      // just its size (no head query, and applyFilter's .in needs the ids anyway).
      if (BOT_SEGMENT_KEYS.includes(key)) {
        const ids = (await resolveBotSegment(db, key)) ?? [];
        return [key, ids.length] as const;
      }
      const base: UserQuery = { filter: key, plan: null, q: "", sort: "created_at", dir: "desc", inactiveDays, segmentIds: null };
      const { count } = await applyFilter(
        db.from("users").select("id", { count: "exact", head: true }),
        base,
      );
      return [key, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<UserFilterKey, number>;
}
