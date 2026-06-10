"use client";

import { useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

interface Stats {
  users: { total: number; active: number; trial: number; cancelled: number; paused: number; suspended: number; newThisMonth: number };
  revenue: { mrr: number; arr: number; currency: string };
  planMix: Record<string, number>;
  bots: { total: number; active: number; meta: number };
  conversations: { total: number; human: number };
  agentRuns: { id: string; status: string; created_at: string }[];
}

const PLAN_HE: Record<string, string> = { basic: "בסיסי", pro: "מקצועי", business: "עסקים", enterprise: "ארגוני" };

export default function AdminOverview() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setS(d)))
      .catch(() => setErr("טעינה נכשלה"));
  }, []);

  if (err) return <div className={styles.error}>{err}</div>;
  if (!s) return <p className={styles.sub}>טוען…</p>;

  return (
    <>
      <h1 className={styles.h1}>סקירה כללית</h1>
      <p className={styles.sub}>מצב המערכת בזמן אמת</p>

      <div className={`${styles.grid} ${styles.grid4}`}>
        <Stat label="הכנסה חודשית (MRR)" value={`${s.revenue.currency}${s.revenue.mrr.toLocaleString()}`} hint={`שנתי: ${s.revenue.currency}${s.revenue.arr.toLocaleString()}`} />
        <Stat label="לקוחות משלמים" value={s.users.active} hint={`${s.users.trial} בניסיון`} />
        <Stat label="סה״כ משתמשים" value={s.users.total} hint={`+${s.users.newThisMonth} החודש`} />
        <Stat label="בוטים פעילים" value={`${s.bots.active}/${s.bots.total}`} hint={`${s.bots.meta} דרך Meta`} />
      </div>

      <div className={`${styles.grid} ${styles.grid4}`} style={{ marginTop: 16 }}>
        <Stat label="שיחות פתוחות (אנושי)" value={s.conversations.human} />
        <Stat label="מנויים שבוטלו" value={s.users.cancelled} />
        <Stat label="מושהים" value={s.users.paused} />
        <Stat label="חסומים" value={s.users.suspended} />
      </div>

      <div className={`${styles.grid} ${styles.grid2}`} style={{ marginTop: 24 }}>
        <div className={styles.card}>
          <div className={styles.statLabel}>פילוח מסלולים (משלמים)</div>
          <table className={styles.table}>
            <tbody>
              {Object.entries(s.planMix).length === 0 && <tr><td className={styles.muted}>אין עדיין מנויים</td></tr>}
              {Object.entries(s.planMix).map(([plan, count]) => (
                <tr key={plan}><td>{PLAN_HE[plan] ?? plan}</td><td style={{ textAlign: "left", fontWeight: 700 }}>{count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.card}>
          <div className={styles.statLabel}>ריצות סוכנים אחרונות</div>
          <table className={styles.table}>
            <tbody>
              {s.agentRuns.length === 0 && <tr><td className={styles.muted}>אין ריצות עדיין</td></tr>}
              {s.agentRuns.slice(0, 6).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString("he-IL")}</td>
                  <td style={{ textAlign: "left" }}>
                    <span className={`${styles.badge} ${r.status === "success" ? styles.badgeActive : styles.badgeCancelled}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}
