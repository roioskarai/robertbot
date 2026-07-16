"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, ShieldOff, ShieldCheck, Check, Download, ArrowUpDown } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { PLAN_IDS, planLabelHe } from "@/lib/plans";
import DataTable, { type Column } from "@/components/admin/DataTable";

// Server-side category filters (mirror lib/admin-users-query UserFilterKey).
const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "trial", label: "בניסיון" },
  { key: "trial_expired", label: "ניסיון הסתיים" },
  { key: "active_paying", label: "משלם פעיל" },
  { key: "comp", label: "מנוי חינמי" },
  { key: "cancelled", label: "בוטל" },
  { key: "paused", label: "מושהה" },
  { key: "inactive", label: "לא פעיל 30 י׳" },
];
const SORTS: { key: string; label: string }[] = [
  { key: "created_at", label: "תאריך הרשמה" },
  { key: "last_login_at", label: "פעילות אחרונה" },
  { key: "trial_ends_at", label: "סיום ניסיון" },
];

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

// The three inline-editable fields. Edits accumulate in a per-row draft and are
// committed together by the row's single "אישור" button (disabled until dirty).
type Draft = { plan?: string; subscription_status?: string; subscription_ends_at?: string | null };
const EDITABLE_KEYS = ["plan", "subscription_status", "subscription_ends_at"] as const;

/** ISO → yyyy-mm-dd for <input type="date">. */
const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [plan, setPlan] = useState("");
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string|null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  };

  // Build the shared query string used by BOTH the list fetch and the CSV export.
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter !== "all") params.set("filter", filter);
    if (filter === "active_paying" && plan) params.set("plan", plan);
    params.set("sort", sort);
    params.set("dir", dir);
    return params;
  }, [q, filter, plan, sort, dir]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?${buildParams()}`);
    const json = await res.json();
    setUsers(json.users ?? []);
    setCounters(json.counters ?? {});
    setLoading(false);
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    window.location.href = `/api/admin/users/export?${buildParams()}`;
  }

  // ── draft helpers ──
  function draftVal<K extends keyof Draft>(u: User, k: K): Draft[K] {
    const d = drafts[u.id];
    if (d && k in d) return d[k];
    return u[k as keyof User] as Draft[K];
  }
  function setDraft(u: User, patch: Draft) {
    setDrafts((prev) => ({ ...prev, [u.id]: { ...prev[u.id], ...patch } }));
  }
  function clearDraft(id: string) {
    setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }
  /** Only the fields that actually changed (dates compared by day). */
  function rowDiff(u: User): Record<string, unknown> {
    const d = drafts[u.id];
    if (!d) return {};
    const out: Record<string, unknown> = {};
    for (const k of EDITABLE_KEYS) {
      if (!(k in d)) continue;
      if (k === "subscription_ends_at") {
        if (toDateInput(d.subscription_ends_at) !== toDateInput(u.subscription_ends_at)) {
          out[k] = d.subscription_ends_at;
        }
      } else if (d[k] !== u[k]) {
        out[k] = d[k];
      }
    }
    return out;
  }

  async function saveRow(u: User) {
    const diff = rowDiff(u);
    if (!Object.keys(diff).length) return;
    setSavingId(u.id);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(diff),
    });
    setSavingId(null);
    if (!res.ok) {
      const dd = await res.json().catch(() => ({}));
      showToast(dd.error || "העדכון נכשל");
      return;
    }
    clearDraft(u.id);
    showToast("השינויים נשמרו");
    load();
  }

  // Suspend/unsuspend stays a distinct immediate action (safety toggle).
  async function toggleSuspend(u: User) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_suspended: !u.is_suspended }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "העדכון נכשל");
      return;
    }
    showToast(u.is_suspended ? "משתמש שוחרר" : "משתמש חסום");
    load();
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
            value={draftVal(u, "plan")}
            onChange={e => setDraft(u, { plan: e.target.value })}>
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
          value={draftVal(u, "subscription_status")}
          onChange={e => setDraft(u, { subscription_status: e.target.value })}>
          {Object.entries(STATUS_HE).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      ),
    },
    {
      key: "subscription_ends_at", label: "תוקף עד", sortable: true, hideBelow: "md",
      render: (u) => (
        <input
          type="date"
          className={`${styles.input} ${styles.inputSm}`}
          style={{ width: "auto", minWidth: 140, fontVariantNumeric: "tabular-nums" }}
          value={toDateInput(draftVal(u, "subscription_ends_at") as string | null)}
          onChange={e => {
            const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
            const status = draftVal(u, "subscription_status");
            // A future end-date is invisible to the customer while status stays
            // trial/cancelled (deriveSubscriptionState ignores subscription_ends_at
            // for those statuses) — auto-promote so the date the admin just set
            // actually takes effect, instead of silently saving a no-op.
            const patch: Draft = (iso && (status === "trial" || status === "cancelled"))
              ? { subscription_ends_at: iso, subscription_status: "active" }
              : { subscription_ends_at: iso };
            setDraft(u, patch);
          }}
          title="לחץ לבחירת תאריך תוקף"
        />
      ),
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
      render: (u) => {
        const dirty = Object.keys(rowDiff(u)).length > 0;
        return (
          <div className={styles.row} style={{ gap: 6, justifyContent: "center" }}>
            <button
              className={`${styles.btn} ${dirty ? styles.btnPrimary : styles.btnGhost} ${styles.btnSm}`}
              disabled={!dirty || savingId === u.id}
              onClick={() => saveRow(u)}
              title={dirty ? "שמור את השינויים בשורה" : "אין שינוי לשמירה"}>
              <Check size={13} strokeWidth={2} /> {savingId === u.id ? "שומר…" : "אישור"}
            </button>
            <button
              className={`${styles.btn} ${u.is_suspended?styles.btnGhost:styles.btnDanger} ${styles.btnSm}`}
              onClick={() => toggleSuspend(u)}>
              {u.is_suspended ? "שחרר" : "חסום"}
            </button>
          </div>
        );
      },
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
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={exportCsv} title="ייצוא תוצאות הסינון ל-CSV">
            <Download size={14} strokeWidth={2} /> ייצוא CSV
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
            <RefreshCw size={14} strokeWidth={2} /> רענן
          </button>
        </div>
      </div>

      {/* Counter chips — click to filter */}
      <div className={styles.row} style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {FILTERS.map((fl) => {
          const active = filter === fl.key;
          const count = counters[fl.key];
          return (
            <button
              key={fl.key}
              onClick={() => setFilter(fl.key)}
              className={`${styles.badge} ${active ? styles.badgeAdmin : ""}`}
              style={{
                cursor: "pointer", border: "1px solid var(--border)",
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--t3)",
                padding: "5px 10px", fontWeight: active ? 700 : 500,
              }}>
              {fl.label}{typeof count === "number" ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><Search size={14} strokeWidth={2} /></span>
          <input className={styles.searchInput} placeholder="חיפוש לפי אימייל או שם…"
            value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        {filter === "active_paying" && (
          <select className={`${styles.input} ${styles.inputSm} ${styles.select}`}
            style={{ width: "auto", minWidth: 120 }}
            value={plan} onChange={e=>setPlan(e.target.value)} title="סנן לפי מסלול">
            <option value="">כל המסלולים</option>
            {PLAN_IDS.map(p => <option key={p} value={p}>{planLabelHe(p)}</option>)}
          </select>
        )}
        <ArrowUpDown size={14} strokeWidth={2} style={{ color: "var(--t4)", flexShrink: 0 }} />
        <select className={`${styles.input} ${styles.inputSm} ${styles.select}`}
          style={{ width: "auto", minWidth: 130 }}
          value={sort} onChange={e=>setSort(e.target.value)} title="מיון">
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
          onClick={() => setDir(d => d === "desc" ? "asc" : "desc")}
          title="הפוך סדר מיון">
          {dir === "desc" ? "יורד ↓" : "עולה ↑"}
        </button>
      </div>

      <DataTable<User>
        rows={users}
        loading={loading}
        pageSize={20}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="לא נמצאו משתמשים"
        columns={userColumns}
      />

      {toast && (
        <div className={`${styles.toast} ${styles.toastOk}`}>
          <ShieldCheck size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
          {toast}
        </div>
      )}
    </>
  );
}
