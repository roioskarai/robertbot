"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, ShieldOff, ShieldCheck, Filter, Gift, X } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { PLAN_IDS, planLabelHe, resolvePlanId, type PlanId } from "@/lib/plans";
import DataTable, { type Column } from "@/components/admin/DataTable";

interface User {
  id: string; email: string; full_name: string | null;
  role: string; plan: string; subscription_status: string;
  pack_balance: number; is_suspended: boolean; totp_enabled: boolean;
  last_login_at: string | null; created_at: string;
  subscription_ends_at: string | null;
  cancel_at_period_end: boolean;
  is_comp: boolean;
  comp_note: string | null;
  bots: { total: number; active: number };
}

const STATUS_HE: Record<string,string> = { trial:"ניסיון", active:"פעיל", cancelled:"בוטל", paused:"מושהה" };

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalBox: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
  padding: 22, width: "100%", maxWidth: 440,
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<string|null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // "הענק מסלול" modal (item #9): plan + expiry (required) + note.
  const [grantFor, setGrantFor] = useState<User | null>(null);
  const [grantPlan, setGrantPlan] = useState<PlanId>("pro");
  const [grantUntil, setGrantUntil] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [grantErr, setGrantErr] = useState<string | null>(null);
  const [grantBusy, setGrantBusy] = useState(false);

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
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "העדכון נכשל");
      return false;
    }
    load();
    if (msg) showToast(msg);
    return true;
  }

  function openGrant(u: User) {
    setGrantFor(u);
    setGrantPlan(resolvePlanId(u.plan));
    // default expiry: 30 days out — the admin adjusts as needed
    const d = new Date(Date.now() + 30 * 86_400_000);
    setGrantUntil(d.toISOString().slice(0, 16));
    setGrantNote(u.comp_note ?? "");
    setGrantErr(null);
  }

  async function submitGrant() {
    if (!grantFor) return;
    const until = grantUntil ? new Date(grantUntil) : null;
    if (!until || Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
      setGrantErr("בחר תאריך תוקף עתידי");
      return;
    }
    setGrantBusy(true);
    const ok = await patch(grantFor.id, {
      plan: grantPlan,
      subscription_status: "active",
      is_comp: true,
      cancel_at_period_end: true, // the trial-cron enforces expiry via this flag
      subscription_ends_at: until.toISOString(),
      comp_note: grantNote.trim() || null,
    }, `הוענק מסלול ${planLabelHe(grantPlan)} עד ${fmtDate(until.toISOString())}`);
    setGrantBusy(false);
    if (ok) setGrantFor(null);
  }

  async function revokeGrant(u: User) {
    if (!window.confirm(`לבטל את ההענקה של ${u.email}? הסטטוס יעבור ל"בוטל" והבוטים יכובו בפקיעה הרגילה.`)) return;
    await patch(u.id, {
      is_comp: false,
      subscription_status: "cancelled",
      cancel_at_period_end: false,
      subscription_ends_at: null,
    }, "ההענקה בוטלה");
  }

  const userColumns: Column<User>[] = [
    {
      key: "email", label: "משתמש", sortable: true,
      render: (u) => (
        <div className={styles.row} style={{ gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: u.is_suspended ? "var(--danger-bg)" : "var(--accent-soft)",
            color: u.is_suspended ? "var(--danger)" : "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 12,
          }}>{u.email.slice(0,2).toUpperCase()}</div>
          <div>
            <Link href={`/admin/users/${u.id}`} className={styles.strong}
              style={{ fontSize: 13, textDecoration: "none" }} title="פתח כרטיס משתמש">
              {u.email}
            </Link>
            <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
              {u.role === "admin" && <span className={`${styles.badge} ${styles.badgeAdmin}`}>אדמין</span>}
              {u.is_suspended && <span className={`${styles.badge} ${styles.badgeCancelled}`}>חסום</span>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "plan", label: "מסלול", sortable: true,
      render: (u) => (
        <div className={styles.row} style={{ gap: 6 }}>
          <select
            className={`${styles.input} ${styles.inputSm} ${styles.select}`}
            style={{ width: "auto", minWidth: 110 }}
            value={u.plan}
            onChange={e => patch(u.id, { plan: e.target.value }, `מסלול עודכן ל-${planLabelHe(resolvePlanId(e.target.value))}`)}>
            {PLAN_IDS.map(p => <option key={p} value={p}>{planLabelHe(p)}</option>)}
          </select>
          {u.is_comp && <span className={`${styles.badge} ${styles.badgeGreen}`} title={u.comp_note ?? undefined}>חינם</span>}
        </div>
      ),
    },
    {
      key: "subscription_status", label: "סטטוס", sortable: true,
      render: (u) => (
        <select
          className={`${styles.input} ${styles.inputSm} ${styles.select}`}
          style={{ width: "auto", minWidth: 100 }}
          value={u.subscription_status}
          onChange={e => patch(u.id, { subscription_status: e.target.value }, "סטטוס עודכן")}>
          {Object.entries(STATUS_HE).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      ),
    },
    {
      key: "subscription_ends_at", label: "תוקף עד", sortable: true, hideBelow: "md",
      render: (u) => <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 12.5 }}>{fmtDate(u.subscription_ends_at) ?? <span className={styles.muted}>—</span>}</span>,
    },
    {
      key: "bots", label: "בוטים", align: "center", hideBelow: "sm",
      sortValue: (u) => u.bots.active,
      render: (u) => <span className={`${styles.badge} ${u.bots.active>0?styles.badgeActive:styles.badgeCancelled}`}>{u.bots.active}/{u.bots.total}</span>,
    },
    {
      key: "pack_balance", label: "Packs", align: "center", sortable: true, hideBelow: "md",
      render: (u) => u.pack_balance > 0
        ? <span className={`${styles.badge} ${styles.badgeGreen}`}>{u.pack_balance}</span>
        : <span className={styles.muted}>—</span>,
    },
    {
      key: "totp_enabled", label: "2FA", align: "center", hideBelow: "sm",
      render: (u) => u.totp_enabled
        ? <ShieldCheck size={16} strokeWidth={2} style={{ color: "var(--success)" }} />
        : <ShieldOff size={16} strokeWidth={2} style={{ color: "var(--t4)" }} />,
    },
    {
      key: "actions", label: "פעולות", align: "center",
      render: (u) => (
        <div className={styles.row} style={{ gap: 6, justifyContent: "center" }}>
          {u.is_comp ? (
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => revokeGrant(u)}>בטל הענקה</button>
          ) : (
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} title="הענק מסלול ללא תשלום, עם תוקף" onClick={() => openGrant(u)}>
              <Gift size={13} strokeWidth={2} /> הענק
            </button>
          )}
          <button
            className={`${styles.btn} ${u.is_suspended?styles.btnGhost:styles.btnDanger} ${styles.btnSm}`}
            onClick={() => patch(u.id, { is_suspended: !u.is_suspended }, u.is_suspended ? "משתמש שוחרר" : "משתמש חסום")}>
            {u.is_suspended ? "שחרר" : "חסום"}
          </button>
        </div>
      ),
    },
  ];

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

      <DataTable<User>
        rows={users}
        loading={loading}
        pageSize={20}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="לא נמצאו משתמשים"
        columns={userColumns}
      />

      {/* Grant modal — plan without payment, time-boxed (item #9) */}
      {grantFor && (
        <div style={modalBackdrop} onClick={() => !grantBusy && setGrantFor(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="הענקת מסלול">
            <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <div className={styles.strong} style={{ fontSize: 15 }}>הענקת מסלול — {grantFor.email}</div>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setGrantFor(null)} disabled={grantBusy} aria-label="סגור">
                <X size={14} strokeWidth={2} />
              </button>
            </div>
            <p className={styles.muted} style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
              המשתמש יקבל את המסלול ללא תשלום עד לתאריך שנבחר. בפקיעה — המנוי יסומן
              &quot;בוטל&quot;, הבוטים יכובו, והלקוח יתבקש לשלם כדי להמשיך. ההענקה לא נספרת ב-MRR.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                מסלול
                <select className={`${styles.input} ${styles.select}`} value={grantPlan}
                  onChange={(e) => setGrantPlan(resolvePlanId(e.target.value))}>
                  {PLAN_IDS.map(p => <option key={p} value={p}>{planLabelHe(p)}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                תוקף עד
                <input type="datetime-local" className={styles.input} value={grantUntil}
                  onChange={(e) => { setGrantUntil(e.target.value); setGrantErr(null); }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                הערה (אופציונלי — למשל &quot;פיצוי&quot; / &quot;בדיקות&quot;)
                <input className={styles.input} value={grantNote} maxLength={300}
                  onChange={(e) => setGrantNote(e.target.value)} placeholder="למה הוענק המסלול?" />
              </label>
              {grantErr && <div style={{ color: "var(--danger)", fontSize: 12.5 }} role="alert">{grantErr}</div>}
              <div className={styles.row} style={{ justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setGrantFor(null)} disabled={grantBusy}>ביטול</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={submitGrant} disabled={grantBusy}>
                  {grantBusy ? "מעניק..." : "הענק מסלול"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${styles.toastOk}`}>
          <ShieldCheck size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
          {toast}
        </div>
      )}
    </>
  );
}
