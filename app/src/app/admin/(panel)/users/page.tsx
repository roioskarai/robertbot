"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  plan: string;
  subscription_status: string;
  pack_balance: number;
  is_suspended: boolean;
  totp_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  bots: { total: number; active: number };
}

const PLANS = ["basic", "pro", "business", "enterprise"];
const PLAN_HE: Record<string, string> = { basic: "בסיסי", pro: "מקצועי", business: "עסקים", enterprise: "ארגוני" };
const STATUSES = ["trial", "active", "cancelled", "paused"];
const STATUS_HE: Record<string, string> = { trial: "ניסיון", active: "פעיל", cancelled: "בוטל", paused: "מושהה" };

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  return (
    <>
      <h1 className={styles.h1}>משתמשים</h1>
      <p className={styles.sub}>ניהול כל המשתמשים והמנויים</p>

      <div className={styles.toolbar}>
        <input className={styles.input} style={{ maxWidth: 300 }} placeholder="חיפוש לפי אימייל…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>רענן</button>
      </div>

      <div className={styles.card} style={{ padding: 0, overflowX: "auto" }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>אימייל</th><th>מסלול</th><th>סטטוס</th><th>בוטים</th>
              <th>Packs</th><th>2FA</th><th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className={styles.muted}>טוען…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={7} className={styles.muted}>אין משתמשים</td></tr>}
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{u.email}</div>
                  {u.role === "admin" && <span className={`${styles.badge} ${styles.badgeAdmin}`}>אדמין</span>}
                  {u.is_suspended && <span className={`${styles.badge} ${styles.badgeCancelled}`}>חסום</span>}
                </td>
                <td>
                  <select className={styles.input} style={{ padding: "5px 8px", width: "auto" }}
                    value={u.plan} onChange={(e) => patch(u.id, { plan: e.target.value })}>
                    {PLANS.map((p) => <option key={p} value={p}>{PLAN_HE[p]}</option>)}
                  </select>
                </td>
                <td>
                  <select className={`${styles.input}`} style={{ padding: "5px 8px", width: "auto" }}
                    value={u.subscription_status} onChange={(e) => patch(u.id, { subscription_status: e.target.value })}>
                    {STATUSES.map((st) => <option key={st} value={st}>{STATUS_HE[st]}</option>)}
                  </select>
                </td>
                <td>{u.bots.active}/{u.bots.total}</td>
                <td>{u.pack_balance}</td>
                <td>{u.totp_enabled ? "✓" : "—"}</td>
                <td>
                  <button className={`${styles.btn} ${u.is_suspended ? styles.btnGhost : styles.btnDanger}`}
                    style={{ padding: "5px 10px" }}
                    onClick={() => patch(u.id, { is_suspended: !u.is_suspended })}>
                    {u.is_suspended ? "שחרר" : "חסום"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
