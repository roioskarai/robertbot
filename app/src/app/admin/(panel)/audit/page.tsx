"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, Filter, Info, Eye } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { AUDIT_ACTION_HE, AUDIT_FIELD_HE } from "@/lib/admin-audit-core";

interface Entry {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  diff: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  meta: { note?: string | null } | null;
  created_at: string;
}

const fmtVal = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (v === true) return "כן";
  if (v === false) return "לא";
  if (typeof v === "string" && !Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}T/.test(v))
    return new Date(v).toLocaleDateString("he-IL");
  return String(v);
};

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [days, setDays] = useState(30);
  const [detail, setDetail] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (q) params.set("q", q);
    if (action) params.set("action", action);
    const res = await fetch(`/api/admin/audit?${params}`);
    const json = await res.json().catch(() => ({}));
    setEntries(json.entries ?? []);
    setAvailable(json.available !== false);
    setLoading(false);
  }, [q, action, days]);

  useEffect(() => { load(); }, [load]);

  const columns: Column<Entry>[] = [
    {
      key: "created_at", label: "זמן", sortable: true,
      render: (e) => (
        <span className={styles.muted} style={{ fontSize: 12, whiteSpace: "nowrap" }}>
          {new Date(e.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "action", label: "פעולה", sortable: true,
      render: (e) => <span className={styles.strong} style={{ fontSize: 13 }}>{AUDIT_ACTION_HE[e.action] ?? e.action}</span>,
    },
    {
      key: "target_label", label: "יעד",
      render: (e) => e.target_label
        ? <span style={{ fontSize: 12.5 }}>{e.target_label}</span>
        : <span className={styles.muted}>—</span>,
    },
    {
      key: "actor_email", label: "מבצע", hideBelow: "md",
      render: (e) => <span className={styles.muted} style={{ fontSize: 12 }}>{e.actor_email ?? "—"}</span>,
    },
    {
      key: "diff", label: "שינוי", align: "center", hideBelow: "sm",
      render: (e) => {
        const changed = Object.keys(e.diff?.after ?? {});
        const hasNote = Boolean(e.meta?.note);
        if (!changed.length && !hasNote) return <span className={styles.muted}>—</span>;
        return (
          <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setDetail(e)}>
            <Eye size={13} strokeWidth={2} />
            {changed.length ? `${changed.length} שדות` : "פרטים"}
          </button>
        );
      },
    },
  ];

  const detailKeys = Object.keys({ ...(detail?.diff?.before ?? {}), ...(detail?.diff?.after ?? {}) });

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>יומן פעולות</h1>
          <p className={styles.pageDesc}>
            תיעוד מלא של כל פעולת אדמין — מי, מתי, מה השתנה. הרשומות אינן ניתנות לעריכה.
          </p>
        </div>
        <div className={styles.pageActions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
            <RefreshCw size={14} strokeWidth={2} /> רענן
          </button>
        </div>
      </div>

      {!available && (
        <div className={styles.card} style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Info size={16} strokeWidth={2} style={{ color: "var(--info)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <div className={styles.strong}>יומן הפעולות עדיין לא פעיל</div>
            <div className={styles.muted}>
              יופעל לאחר הרצת מיגרציה 0011 ב-Supabase (דורש אישור <code>APPROVED - DATABASE</code>).
              עד אז פעולות אדמין מתבצעות כרגיל אך אינן נרשמות.
            </div>
          </div>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><Search size={14} strokeWidth={2} /></span>
          <input className={styles.searchInput} placeholder="חיפוש לפי אימייל (יעד/מבצע)…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Filter size={14} strokeWidth={2} style={{ color: "var(--t4)", flexShrink: 0 }} />
        <select className={`${styles.input} ${styles.inputSm} ${styles.select}`}
          style={{ width: "auto", minWidth: 150 }}
          value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">כל הפעולות</option>
          {Object.entries(AUDIT_ACTION_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`${styles.input} ${styles.inputSm} ${styles.select}`}
          style={{ width: "auto", minWidth: 110 }}
          value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>7 ימים</option>
          <option value={30}>30 ימים</option>
          <option value={90}>90 ימים</option>
          <option value={365}>שנה</option>
        </select>
      </div>

      <DataTable<Entry>
        rows={entries}
        loading={loading}
        pageSize={25}
        emptyText={available ? "אין רשומות בטווח שנבחר" : "אין רשומות — היומן ממתין למיגרציה"}
        columns={columns}
      />

      {/* Diff detail modal */}
      {detail && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setDetail(null)}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
              padding: 22, width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="פירוט שינוי"
          >
            <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <div className={styles.strong} style={{ fontSize: 15 }}>
                {AUDIT_ACTION_HE[detail.action] ?? detail.action}
              </div>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setDetail(null)}>סגור</button>
            </div>
            <div className={styles.muted} style={{ fontSize: 12.5, marginBottom: 14 }}>
              {detail.target_label && <>יעד: {detail.target_label} · </>}
              מבצע: {detail.actor_email ?? "—"} · {new Date(detail.created_at).toLocaleString("he-IL")}
            </div>
            {detail.meta?.note && (
              <div className={styles.card} style={{ padding: 10, marginBottom: 12, fontSize: 13 }}>
                <span className={styles.muted}>הערה: </span>{detail.meta.note}
              </div>
            )}
            {detailKeys.length > 0 && (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead><tr><th>שדה</th><th>לפני</th><th>אחרי</th></tr></thead>
                  <tbody>
                    {detailKeys.map((k) => (
                      <tr key={k}>
                        <td className={styles.strong} style={{ fontSize: 12.5 }}>{AUDIT_FIELD_HE[k] ?? k}</td>
                        <td className={styles.muted} style={{ fontSize: 12.5 }}>{fmtVal(detail.diff?.before?.[k])}</td>
                        <td style={{ fontSize: 12.5 }}>{fmtVal(detail.diff?.after?.[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
