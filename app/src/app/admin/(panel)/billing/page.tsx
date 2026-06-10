"use client";

import { useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

interface Billing {
  summary: { mrr: number; arr: number; payingCustomers: number; trials: number; cancelled: number; currency: string };
  byPlan: Record<string, { count: number; mrr: number; label: string }>;
  customers: { id: string; email: string; plan: string; cycle: string; provider: string | null; since: string }[];
}

export default function AdminBilling() {
  const [b, setB] = useState<Billing | null>(null);

  useEffect(() => {
    fetch("/api/admin/billing").then((r) => r.json()).then(setB);
  }, []);

  if (!b) return <p className={styles.sub}>טוען…</p>;
  const c = b.summary.currency;

  return (
    <>
      <h1 className={styles.h1}>כספים</h1>
      <p className={styles.sub}>הכנסות ומנויים</p>

      <div className={`${styles.grid} ${styles.grid4}`}>
        <Stat label="MRR" value={`${c}${b.summary.mrr.toLocaleString()}`} />
        <Stat label="ARR (שנתי)" value={`${c}${b.summary.arr.toLocaleString()}`} />
        <Stat label="לקוחות משלמים" value={b.summary.payingCustomers} />
        <Stat label="בניסיון" value={b.summary.trials} />
      </div>

      <div className={`${styles.grid} ${styles.grid2}`} style={{ marginTop: 24 }}>
        <div className={styles.card}>
          <div className={styles.statLabel}>הכנסה לפי מסלול</div>
          <table className={styles.table}>
            <thead><tr><th>מסלול</th><th>לקוחות</th><th>MRR</th></tr></thead>
            <tbody>
              {Object.entries(b.byPlan).length === 0 && <tr><td colSpan={3} className={styles.muted}>אין מנויים</td></tr>}
              {Object.entries(b.byPlan).map(([k, v]) => (
                <tr key={k}><td>{v.label}</td><td>{v.count}</td><td>{c}{v.mrr.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.card}>
          <div className={styles.statLabel}>לקוחות משלמים</div>
          <table className={styles.table}>
            <thead><tr><th>אימייל</th><th>מסלול</th><th>ספק</th></tr></thead>
            <tbody>
              {b.customers.length === 0 && <tr><td colSpan={3} className={styles.muted}>אין עדיין</td></tr>}
              {b.customers.map((cu) => (
                <tr key={cu.id}><td>{cu.email}</td><td>{cu.plan}</td><td>{cu.provider ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className={styles.card}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>;
}
