"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, RefreshCw, ShieldOff, ShieldCheck, Filter } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

interface User {
  id: string; email: string; full_name: string | null;
  role: string; plan: string; subscription_status: string;
  pack_balance: number; is_suspended: boolean; totp_enabled: boolean;
  last_login_at: string | null; created_at: string;
  bots: { total: number; active: number };
}

const PLANS = ["basic","pro","business","enterprise"];
const PLAN_HE: Record<string,string> = { basic:"בסיסי", pro:"מקצועי", business:"עסקים", enterprise:"ארגוני" };
const STATUS_HE: Record<string,string> = { trial:"ניסיון", active:"פעיל", cancelled:"בוטל", paused:"מושהה" };


function SkRow() {
  return (
    <tr>
      {[200,120,100,70,50,50,80].map((w,i) => (
        <td key={i}><div className={`${styles.skeleton} ${styles.skBlock}`} style={{ width: w }} /></td>
      ))}
    </tr>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<string|null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string,unknown>, msg?: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
    if (msg) showToast(msg);
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>משתמשים</h1>
          <p className={styles.pageDesc}>
            {!loading && `${users.length} משתמשים`}
          </p>
        </div>
        <div className={styles.pageActions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
            <RefreshCw size={14} strokeWidth={2} /> רענן
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><Search size={14} strokeWidth={2} /></span>
          <input className={styles.searchInput} placeholder="חיפוש לפי אימייל…"
            value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <Filter size={14} strokeWidth={2} style={{ color: "var(--t4)", flexShrink: 0 }} />
        <select className={`${styles.input} ${styles.inputSm} ${styles.select}`}
          style={{ width: "auto", minWidth: 130 }}
          value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS_HE).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>משתמש</th>
                <th>מסלול</th>
                <th>סטטוס</th>
                <th style={{ textAlign: "center" }}>בוטים</th>
                <th style={{ textAlign: "center" }}>Packs</th>
                <th style={{ textAlign: "center" }}>2FA</th>
                <th style={{ textAlign: "center" }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading && [0,1,2,3,4,5].map(i=><SkRow key={i}/>)}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7}>
                  <div className={styles.tableEmpty}>לא נמצאו משתמשים</div>
                </td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.row} style={{ gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: u.is_suspended ? "var(--danger-bg)" : "var(--accent-soft)",
                        color: u.is_suspended ? "var(--danger)" : "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 12,
                      }}>
                        {u.email.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.strong} style={{ fontSize: 13 }}>{u.email}</div>
                        <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                          {u.role === "admin" && <span className={`${styles.badge} ${styles.badgeAdmin}`}>אדמין</span>}
                          {u.is_suspended && <span className={`${styles.badge} ${styles.badgeCancelled}`}>חסום</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className={`${styles.input} ${styles.inputSm} ${styles.select}`}
                      style={{ width: "auto", minWidth: 110 }}
                      value={u.plan}
                      onChange={e => patch(u.id, { plan: e.target.value }, `מסלול עודכן ל-${PLAN_HE[e.target.value]}`)}>
                      {PLANS.map(p => <option key={p} value={p}>{PLAN_HE[p]}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      className={`${styles.input} ${styles.inputSm} ${styles.select}`}
                      style={{ width: "auto", minWidth: 100 }}
                      value={u.subscription_status}
                      onChange={e => patch(u.id, { subscription_status: e.target.value }, "סטטוס עודכן")}>
                      {Object.entries(STATUS_HE).map(([k,v]) =>
                        <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`${styles.badge} ${u.bots.active>0?styles.badgeActive:styles.badgeCancelled}`}>
                      {u.bots.active}/{u.bots.total}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                    {u.pack_balance > 0
                      ? <span className={`${styles.badge} ${styles.badgeGreen}`}>{u.pack_balance}</span>
                      : <span className={styles.muted}>—</span>}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {u.totp_enabled
                      ? <ShieldCheck size={16} strokeWidth={2} style={{ color: "var(--success)" }} />
                      : <ShieldOff size={16} strokeWidth={2} style={{ color: "var(--t4)" }} />}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className={`${styles.btn} ${u.is_suspended?styles.btnGhost:styles.btnDanger} ${styles.btnSm}`}
                      onClick={() => patch(u.id, { is_suspended: !u.is_suspended },
                        u.is_suspended ? "משתמש שוחרר" : "משתמש חסום")}>
                      {u.is_suspended ? "שחרר" : "חסום"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${styles.toastOk}`}>
          <ShieldCheck size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
          {toast}
        </div>
      )}
    </>
  );
}
