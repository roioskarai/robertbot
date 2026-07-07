"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Clock, Info } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import type { AdminNotification } from "@/lib/admin-notifications";

const SEEN_KEY = "rb_admin_notif_seen";

const ICONS = { error: AlertTriangle, warn: Clock, info: Info } as const;

// Topbar bell: derives alerts from /api/admin/notifications (computed, no
// table). Unseen count = items newer than the client's last "mark all read".
export default function NotificationBell() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeenAt(Number(localStorage.getItem(SEEN_KEY)) || 0);
    const load = () => {
      fetch("/api/admin/notifications", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.notifications) setItems(d.notifications as AdminNotification[]); })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 120_000); // refresh every 2 min
    return () => clearInterval(t);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unseen = items.filter((n) => Date.parse(n.ts) > seenAt).length;

  function markAllRead() {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    setSeenAt(now);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={styles.bellBtn}
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        aria-label="התראות"
        title="התראות"
      >
        <Bell size={16} strokeWidth={1.9} />
        {unseen > 0 && <span className={styles.bellDot}>{unseen > 9 ? "9+" : unseen}</span>}
      </button>

      {open && (
        <div className={styles.notifPanel} role="dialog" aria-label="התראות">
          <div className={styles.notifHead}>
            <span className={styles.strong} style={{ fontSize: 13 }}>התראות</span>
            {items.length > 0 && (
              <button className={styles.notifMark} onClick={markAllRead}>סמן הכל כנקרא</button>
            )}
          </div>
          {items.length === 0 ? (
            <div className={styles.notifEmpty}>אין התראות חדשות</div>
          ) : (
            <div className={styles.notifList}>
              {items.map((n) => {
                const Icon = ICONS[n.severity];
                return (
                  <Link key={n.id} href={n.href} className={styles.notifItem} onClick={() => setOpen(false)}>
                    <span className={`${styles.notifIcon} ${styles[n.severity]}`}><Icon size={14} strokeWidth={2} /></span>
                    <span className={styles.notifText}>{n.title}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
