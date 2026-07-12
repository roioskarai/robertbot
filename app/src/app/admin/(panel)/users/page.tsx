"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, ShieldOff, ShieldCheck, Filter, Check } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { PLAN_IDS, planLabelHe } from "@/lib/plans";
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

// The three inline-editable fields. Edits accumulate in a per-row draft and are
// committed together by the row's single "אישור" button (disabled until dirty).
type Draft = { plan?: string; subscription_status?: string; subscription_ends_at?: string | null };
const EDITABLE_KEYS = ["plan", "subscription_status", "subscription_ends_at"] as const;

/** ISO → yyyy-mm-dd for <input type="date">. */
const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
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
    // "comp" is a special filter (is_comp = true), not a subscription_status.
    if (statusFilter === "comp") params.set("comp", "1");
    else if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => { load(); }, [load]);

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
          onChange={e => setDraft(u, { subscription_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
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
          <option value="comp">מנוי חינמי</option>
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

      {toast && (
        <div className={`${styles.toast} ${styles.toastOk}`}>
          <ShieldCheck size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
          {toast}
        </div>
      )}
    </>
  );
}
