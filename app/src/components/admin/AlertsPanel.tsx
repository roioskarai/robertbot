"use client";

// Smart-alerts panel for the admin dashboard — same derived feed as the
// NotificationBell, rendered as a card with severity dots and links.

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

interface Alert {
  id: string;
  severity: "info" | "warn" | "error";
  title: string;
  href: string;
  ts: string;
}

const DOT: Record<Alert["severity"], string> = {
  error: "var(--danger)",
  warn: "var(--warning)",
  info: "var(--info)",
};

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setAlerts(d?.notifications ?? []); })
      .catch(() => { if (!cancelled) setAlerts([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}><BellRing size={14} strokeWidth={2} /> התראות חכמות</div>
      {alerts === null ? (
        <div className={styles.skeleton} style={{ height: 80 }} />
      ) : alerts.length === 0 ? (
        <div className={styles.tableEmpty} style={{ padding: "28px 16px" }}>אין התראות פעילות 🎉</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {alerts.slice(0, 8).map((a, i) => (
            <Link
              key={a.id}
              href={a.href}
              className={styles.row}
              style={{
                gap: 10, padding: "9px 2px", textDecoration: "none", color: "var(--t1)",
                borderBottom: i < Math.min(alerts.length, 8) - 1 ? "1px solid var(--border-soft)" : "none",
                alignItems: "flex-start",
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                background: DOT[a.severity],
              }} />
              <span style={{ fontSize: 13, lineHeight: 1.5 }} className={styles.flex1}>{a.title}</span>
            </Link>
          ))}
          {alerts.length > 8 && (
            <div className={styles.muted} style={{ fontSize: 12, paddingTop: 8 }}>
              ועוד {alerts.length - 8} התראות בפעמון…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
