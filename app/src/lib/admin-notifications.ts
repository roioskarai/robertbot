// Pure notification derivation for the admin bell — computed at read time
// from existing tables, no notifications table / migration / write path.
// Items self-clear when their condition passes; "seen" state is a client-side
// localStorage timestamp. IDs are stable per (type, entity, day) so the same
// alert isn't "new" again on every poll within a day.

export interface AdminNotifUserRow {
  id: string;
  email: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  is_comp?: boolean | null;
  subscription_ends_at?: string | null;
  created_at?: string | null;
}

export interface AdminNotifRunRow {
  id: string;
  agent?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface AdminNotification {
  id: string;
  severity: "info" | "warn" | "error";
  title: string;
  href: string;
  ts: string; // ISO — used for the unseen count vs the client's last-seen mark
}

const DAY = 86_400_000;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

export function deriveNotifications(
  users: AdminNotifUserRow[],
  runs: AdminNotifRunRow[],
  now = new Date(),
): AdminNotification[] {
  const items: AdminNotification[] = [];
  const nowMs = now.getTime();

  // 1. Trials ending within 48h (conversion moment — reach out now).
  for (const u of users) {
    if (u.subscription_status !== "trial" || !u.trial_ends_at) continue;
    const ends = Date.parse(u.trial_ends_at);
    if (Number.isNaN(ends) || ends < nowMs || ends > nowMs + 2 * DAY) continue;
    items.push({
      id: `trial-ending:${u.id}:${dayOf(now)}`,
      severity: "warn",
      title: `תקופת הניסיון של ${u.email ?? "משתמש"} מסתיימת בקרוב`,
      href: "/admin/users",
      ts: new Date(ends).toISOString(),
    });
  }

  // 2. Comp grants expiring within 7 days (decide: extend or let it lapse).
  for (const u of users) {
    if (!u.is_comp || u.subscription_status !== "active" || !u.subscription_ends_at) continue;
    const ends = Date.parse(u.subscription_ends_at);
    if (Number.isNaN(ends) || ends < nowMs || ends > nowMs + 7 * DAY) continue;
    const daysLeft = Math.max(1, Math.ceil((ends - nowMs) / DAY));
    items.push({
      id: `comp-expiring:${u.id}:${dayOf(now)}`,
      severity: "info",
      title: `מנוי החינם של ${u.email ?? "משתמש"} פג בעוד ${daysLeft} ימים`,
      href: "/admin/users",
      ts: new Date(ends).toISOString(),
    });
  }

  // 3. Failed agent runs in the last 24h.
  for (const r of runs) {
    if (r.status !== "error" || !r.created_at) continue;
    const ts = Date.parse(r.created_at);
    if (Number.isNaN(ts) || ts < nowMs - DAY) continue;
    items.push({
      id: `agent-failed:${r.id}`,
      severity: "error",
      title: `ריצת סוכן נכשלה: ${r.agent ?? "לא ידוע"}`,
      href: "/admin/agents",
      ts: r.created_at,
    });
  }

  // 4. New signups in the last 24h (single aggregate item).
  const newUsers = users.filter((u) => {
    const ts = u.created_at ? Date.parse(u.created_at) : NaN;
    return !Number.isNaN(ts) && ts >= nowMs - DAY;
  }).length;
  if (newUsers > 0) {
    items.push({
      id: `new-users:${dayOf(now)}`,
      severity: "info",
      title: `${newUsers} משתמשים חדשים ב-24 השעות האחרונות`,
      href: "/admin/users",
      ts: now.toISOString(),
    });
  }

  // Most severe first, then newest.
  const rank = { error: 0, warn: 1, info: 2 } as const;
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || b.ts.localeCompare(a.ts));
  return items;
}
