"use client";

import { useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

interface AdminBot {
  id: string;
  name: string;
  bot_name: string;
  business_type: string | null;
  active: boolean;
  whatsapp_number: string | null;
  wa_provider: string | null;
  owner_email: string | null;
  created_at: string;
}

export default function AdminBots() {
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/bots")
      .then((r) => r.json())
      .then((d) => { setBots(d.bots ?? []); setLoading(false); });
  }, []);

  return (
    <>
      <h1 className={styles.h1}>בוטים</h1>
      <p className={styles.sub}>כל הבוטים במערכת ({bots.length})</p>

      <div className={styles.card} style={{ padding: 0, overflowX: "auto" }}>
        <table className={styles.table}>
          <thead>
            <tr><th>עסק</th><th>בעלים</th><th>מספר וואטסאפ</th><th>ספק</th><th>סטטוס</th><th>נוצר</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className={styles.muted}>טוען…</td></tr>}
            {!loading && bots.length === 0 && <tr><td colSpan={6} className={styles.muted}>אין בוטים</td></tr>}
            {bots.map((b) => (
              <tr key={b.id}>
                <td><div style={{ fontWeight: 600 }}>{b.name}</div><div className={styles.muted}>{b.bot_name}</div></td>
                <td>{b.owner_email ?? "—"}</td>
                <td dir="ltr">{b.whatsapp_number ?? "לא מחובר"}</td>
                <td>{b.wa_provider ?? "—"}</td>
                <td><span className={`${styles.badge} ${b.active ? styles.badgeActive : styles.badgeCancelled}`}>{b.active ? "פעיל" : "כבוי"}</span></td>
                <td>{new Date(b.created_at).toLocaleDateString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
