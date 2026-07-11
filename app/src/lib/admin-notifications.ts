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
  last_login_at?: string | null;
  is_suspended?: boolean | null;
}

export interface AdminNotifRunRow {
  id: string;
  agent?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface AdminNotifPaymentRow {
  event_type: string;
  user_id?: string | null;
  created_at?: string | null;
}

export interface AdminNotifSecurityRow {
  action: string;
  created_at?: string | null;
}

/** Optional extra inputs (kept out of the positional signature for back-compat). */
export interface AdminNotifExtras {
  paymentEvents?: AdminNotifPaymentRow[];
  securityEvents?: AdminNotifSecurityRow[];
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
  extras: AdminNotifExtras = {},
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

  // 5. Payments in the last 7d whose user has no active subscription — a paid
  //    event that didn't stick (webhook bug / manual mixup). Money signal → error.
  const usersById = new Map(users.map((u) => [u.id, u]));
  for (const p of extras.paymentEvents ?? []) {
    if (p.event_type !== "subscription_active" && p.event_type !== "pack_purchased") continue;
    const ts = p.created_at ? Date.parse(p.created_at) : NaN;
    if (Number.isNaN(ts) || ts < nowMs - 7 * DAY) continue;
    const u = p.user_id ? usersById.get(p.user_id) : undefined;
    if (u && u.subscription_status === "active" && !u.is_suspended) continue;
    items.push({
      id: `orphan-payment:${p.user_id ?? "unknown"}:${dayOf(now)}`,
      severity: "error",
      title: u
        ? `התקבל תשלום מ-${u.email ?? "משתמש"} אך אין לו מנוי פעיל`
        : "התקבל תשלום שלא משויך לאף משתמש",
      href: u ? `/admin/users/${u.id}` : "/admin/billing",
      ts: new Date(ts).toISOString(),
    });
  }

  // 6. Signup drop: trailing 7d < 40% of the previous-4-weeks weekly average
  //    (only meaningful when the average is ≥ 3 signups/week).
  {
    let thisWeek = 0;
    let prev4Weeks = 0;
    for (const u of users) {
      const ts = u.created_at ? Date.parse(u.created_at) : NaN;
      if (Number.isNaN(ts)) continue;
      if (ts >= nowMs - 7 * DAY) thisWeek += 1;
      else if (ts >= nowMs - 35 * DAY) prev4Weeks += 1;
    }
    const weeklyAvg = prev4Weeks / 4;
    if (weeklyAvg >= 3 && thisWeek < weeklyAvg * 0.4) {
      items.push({
        id: `signup-drop:${dayOf(now)}`,
        severity: "warn",
        title: `ירידה בהרשמות: ${thisWeek} השבוע לעומת ממוצע ${Math.round(weeklyAvg)} בשבועות הקודמים`,
        href: "/admin",
        ts: now.toISOString(),
      });
    }
  }

  // 7. Repeated agent failure: same agent ≥3 errors within 72h.
  {
    const failsByAgent = new Map<string, number>();
    for (const r of runs) {
      if (r.status !== "error" || !r.created_at) continue;
      const ts = Date.parse(r.created_at);
      if (Number.isNaN(ts) || ts < nowMs - 3 * DAY) continue;
      const key = r.agent ?? "unknown";
      failsByAgent.set(key, (failsByAgent.get(key) ?? 0) + 1);
    }
    for (const [agent, count] of failsByAgent) {
      if (count < 3) continue;
      items.push({
        id: `agent-repeat-failure:${agent}:${dayOf(now)}`,
        severity: "error",
        title: `הסוכן ${agent} נכשל ${count} פעמים ב-72 השעות האחרונות`,
        href: "/admin/agents",
        ts: now.toISOString(),
      });
    }
  }

  // 8. Dormant trials: registered >48h ago and never logged in (aggregate).
  {
    const dormant = users.filter((u) => {
      if (u.subscription_status !== "trial" || u.last_login_at) return false;
      const ts = u.created_at ? Date.parse(u.created_at) : NaN;
      return !Number.isNaN(ts) && ts < nowMs - 2 * DAY;
    }).length;
    if (dormant > 0) {
      items.push({
        id: `dormant-trials:${dayOf(now)}`,
        severity: "info",
        title: `${dormant} משתמשי ניסיון מעולם לא התחברו — שווה פנייה`,
        href: "/admin/users",
        ts: now.toISOString(),
      });
    }
  }

  // 9. Webhook signature failures: ≥5 in 24h (from the admin audit log).
  {
    const sigFails = (extras.securityEvents ?? []).filter((e) => {
      if (e.action !== "security.webhook_signature_failed") return false;
      const ts = e.created_at ? Date.parse(e.created_at) : NaN;
      return !Number.isNaN(ts) && ts >= nowMs - DAY;
    }).length;
    if (sigFails >= 5) {
      items.push({
        id: `webhook-sig-failures:${dayOf(now)}`,
        severity: "error",
        title: `${sigFails} כשלי חתימת Webhook ב-24 השעות האחרונות — ייתכן ניסיון תקיפה או תקלת תצורה`,
        href: "/admin/audit",
        ts: now.toISOString(),
      });
    }
  }

  // Most severe first, then newest.
  const rank = { error: 0, warn: 1, info: 2 } as const;
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || b.ts.localeCompare(a.ts));
  return items;
}
