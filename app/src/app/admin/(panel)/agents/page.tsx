"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Cpu, RefreshCw, CheckCircle, XCircle, Clock, Copy, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import DataTable, { type Column } from "@/components/admin/DataTable";

interface Proposal {
  type: string;
  target?: string;
  label: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "applied" | "dismissed";
}

interface Run {
  id: string; agent: string; status: string; mode: string;
  summary: string|null; tokens: number; created_at: string;
  proposed_actions?: Proposal[];
}

const APPLYABLE = new Set(["prompt_improvement", "faq_addition"]);

const PROPOSAL_STATUS_HE: Record<Proposal["status"], string> = {
  pending: "ממתינה", approved: "מאושרת", applied: "הוחלה", dismissed: "נדחתה",
};

function PayloadPreview({ p, onCopied }: { p: Proposal; onCopied: () => void }) {
  if (p.type === "prompt_improvement") {
    const diag = String(p.payload.diagnosis ?? "");
    const add = String(p.payload.promptAddition ?? "");
    return (
      <div style={{ fontSize: 12.5, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 6 }}>
        {diag && <div><span className={styles.muted}>אבחנה: </span>{diag}</div>}
        <div style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", whiteSpace: "pre-wrap" }}>
          {add}
        </div>
      </div>
    );
  }
  if (p.type === "faq_addition") {
    const items = Array.isArray(p.payload.items) ? (p.payload.items as { question: string; answer: string }[]) : [];
    return (
      <div style={{ fontSize: 12.5, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((f, i) => (
          <div key={i} style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
            <div className={styles.strong} style={{ fontSize: 12.5 }}>{f.question}</div>
            <div className={styles.muted} style={{ fontSize: 12 }}>{f.answer}</div>
          </div>
        ))}
      </div>
    );
  }
  if (p.type === "retention_offer") {
    const subject = String(p.payload.subject ?? "");
    const body = String(p.payload.body ?? "");
    const reason = String(p.payload.reason ?? "");
    const email = String(p.payload.email ?? "");
    return (
      <div style={{ fontSize: 12.5, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 6 }}>
        {reason && <div><span className={styles.muted}>נימוק: </span>{reason}</div>}
        <div style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
          <div className={styles.strong} style={{ fontSize: 12.5, marginBottom: 4 }}>{subject}</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{body}</div>
        </div>
        <div className={styles.row} style={{ gap: 6 }}>
          <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
            onClick={() => { navigator.clipboard?.writeText(`${subject}\n\n${body}`); onCopied(); }}>
            <Copy size={12} strokeWidth={2} /> העתק הודעה
          </button>
          {email && <span className={styles.muted} style={{ fontSize: 11.5, direction: "ltr" }}>{email}</span>}
        </div>
      </div>
    );
  }
  return <pre style={{ fontSize: 11.5, whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(p.payload, null, 2)}</pre>;
}

function ProposalsPanel({
  runs, loading, deciding, onDecide, onCopied,
}: {
  runs: Run[];
  loading: boolean;
  deciding: string | null;
  onDecide: (runId: string, actionIndex: number, decision: "approve"|"dismiss"|"apply") => void;
  onCopied: () => void;
}) {
  const [open, setOpen] = useState<string|null>(null);
  const items = runs.flatMap((r) =>
    (r.proposed_actions ?? []).map((p, index) => ({ run: r, p, index })),
  ).filter(({ p }) => p.status === "pending" || p.status === "approved");

  if (loading || items.length === 0) return null;

  return (
    <div className={styles.card} style={{ marginBottom: 24 }}>
      <div className={styles.cardTitle}>
        <Sparkles size={14} strokeWidth={2} /> הצעות ממתינות להחלטה ({items.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(({ run, p, index }) => {
          const key = `${run.id}:${index}`;
          const busy = deciding === key;
          const expanded = open === key;
          return (
            <div key={key} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
              <div className={styles.row} style={{ gap: 8, flexWrap: "wrap" }}>
                <span className={`${styles.badge} ${p.status === "approved" ? styles.badgeActive : styles.badgeTrial}`}>
                  {PROPOSAL_STATUS_HE[p.status]}
                </span>
                <span className={`${styles.strong} ${styles.flex1}`} style={{ fontSize: 13 }}>{p.label}</span>
                <span className={styles.muted} style={{ fontSize: 11.5 }}>{run.agent}</span>
                <div className={styles.row} style={{ gap: 6, marginRight: "auto" }}>
                  <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setOpen(expanded ? null : key)}>
                    {expanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />} פרטים
                  </button>
                  {p.status === "pending" && (<>
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={busy}
                      onClick={() => onDecide(run.id, index, "approve")}>אשר</button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} disabled={busy}
                      style={{ color: "var(--danger)" }}
                      onClick={() => onDecide(run.id, index, "dismiss")}>דחה</button>
                  </>)}
                  {p.status === "approved" && APPLYABLE.has(p.type) && (
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={busy}
                      title="מעדכן את הגדרות הבוט בפועל"
                      onClick={() => onDecide(run.id, index, "apply")}>{busy ? "…" : "החל על הבוט"}</button>
                  )}
                  {p.status === "approved" && !APPLYABLE.has(p.type) && (
                    <span className={styles.muted} style={{ fontSize: 11.5 }}>שליחה ידנית בלבד</span>
                  )}
                </div>
              </div>
              {expanded && (
                <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <PayloadPreview p={p} onCopied={onCopied} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const statusIcon = (s: string) => {
  if (s==="success") return <CheckCircle size={14} strokeWidth={2} style={{color:"var(--success)"}}/>;
  if (s==="error")   return <XCircle     size={14} strokeWidth={2} style={{color:"var(--danger)"}}/>;
  return <Clock size={14} strokeWidth={2} style={{color:"var(--warning)"}}/>;
};

const statusClass = (s: string) =>
  s==="success"?styles.badgeActive:s==="error"?styles.badgeCancelled:styles.badgeTrial;

export default function AdminAgents() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string|null>(null);
  const [toast, setToast] = useState<{msg:string; ok:boolean}|null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({msg, ok});
    setTimeout(()=>setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/agents");
    const json = await res.json();
    setRuns(json.runs ?? []);
    setAvailable(json.available ?? []);
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  async function run(agent: string, mode: "dry"|"live") {
    const key = `${agent}:${mode}`;
    setRunning(key);
    try {
      const res = await fetch("/api/admin/agents", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({agent, mode}),
      });
      const json = await res.json();
      showToast(res.ok ? `✓ ${agent} (${mode}) הורץ בהצלחה` : json.error||"שגיאה", res.ok);
      load();
    } catch { showToast("שגיאת רשת", false); }
    finally { setRunning(null); }
  }

  const [deciding, setDeciding] = useState<string|null>(null);
  async function decide(runId: string, actionIndex: number, decision: "approve"|"dismiss"|"apply") {
    const key = `${runId}:${actionIndex}`;
    setDeciding(key);
    try {
      const res = await fetch("/api/admin/agents/actions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, actionIndex, decision }),
      });
      const json = await res.json().catch(()=>({}));
      showToast(res.ok
        ? decision === "approve" ? "✓ ההצעה אושרה" : decision === "dismiss" ? "ההצעה נדחתה" : "✓ ההצעה הוחלה על הבוט"
        : json.error || "הפעולה נכשלה", res.ok);
      if (res.ok) load();
    } catch { showToast("שגיאת רשת", false); }
    finally { setDeciding(null); }
  }

  const runColumns: Column<Run>[] = [
    {
      key: "created_at", label: "תאריך", sortable: true,
      render: (r) => <span className={styles.muted} style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        {new Date(r.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
      </span>,
    },
    { key: "agent", label: "סוכן", sortable: true, render: (r) => <span className={styles.strong} style={{ fontSize: 13 }}>{r.agent}</span> },
    { key: "mode", label: "מצב", hideBelow: "sm",
      render: (r) => <span className={`${styles.badge} ${r.mode === "live" ? styles.badgeActive : styles.badgeTrial}`}>{r.mode}</span> },
    {
      key: "status", label: "סטטוס", sortable: true,
      render: (r) => (
        <div className={styles.row} style={{ gap: 5 }}>
          {statusIcon(r.status)}
          <span className={`${styles.badge} ${statusClass(r.status)}`}>{r.status}</span>
        </div>
      ),
    },
    { key: "summary", label: "סיכום", hideBelow: "md",
      render: (r) => <span style={{ fontSize: 12, color: "var(--t3)" }}>{r.summary || "—"}</span> },
    { key: "tokens", label: "טוקנים", align: "center", sortable: true, hideBelow: "sm",
      render: (r) => <span className={styles.mono}>{r.tokens?.toLocaleString() || "0"}</span> },
  ];

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>סוכני AI</h1>
          <p className={styles.pageDesc}>הפעלה ידנית + יומן ריצות</p>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
          <RefreshCw size={14} strokeWidth={2}/> רענן
        </button>
      </div>

      {/* Agent cards */}
      <div className={`${styles.grid} ${styles.g3}`} style={{marginBottom:24}}>
        {available.map(agent => (
          <div key={agent} className={styles.card} style={{padding:"16px 18px"}}>
            <div className={styles.row} style={{marginBottom:12}}>
              <div className={styles.statIconWrap} style={{width:34,height:34,borderRadius:9}}>
                <Cpu size={16} strokeWidth={2}/>
              </div>
              <div className={styles.strong} style={{fontSize:13}}>{agent}</div>
            </div>
            <div className={styles.row}>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.flex1}`}
                onClick={()=>run(agent,"dry")}
                disabled={running!==null}
                title="מצב טיוטה — לא מבצע שינויים אמיתיים">
                <Play size={12} strokeWidth={2.5}/> טיוטה
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm} ${styles.flex1}`}
                onClick={()=>run(agent,"live")}
                disabled={running!==null}>
                {running===`${agent}:live` ? "…" : <><Play size={12} strokeWidth={2.5}/> חי</>}
              </button>
            </div>
          </div>
        ))}
        {!available.length && !loading && (
          <div className={`${styles.card} ${styles.empty}`} style={{gridColumn:"1/-1"}}>
            <div className={styles.emptyText}>אין סוכנים זמינים</div>
          </div>
        )}
      </div>

      {/* Proposals awaiting decision */}
      <ProposalsPanel runs={runs} loading={loading} deciding={deciding} onDecide={decide} onCopied={() => showToast("ההודעה הועתקה")} />

      {/* Runs table */}
      <div className={styles.card} style={{padding:0, overflow:"hidden"}}>
        <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border)"}}>
          <div className={styles.cardTitle} style={{margin:0}}>יומן ריצות (100 אחרונות)</div>
        </div>
        <DataTable<Run>
          rows={runs}
          loading={loading}
          pageSize={20}
          emptyText="אין ריצות עדיין"
          columns={runColumns}
        />
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok?styles.toastOk:styles.toastErr}`}>
          {toast.ok
            ? <CheckCircle size={14} strokeWidth={2} style={{color:"var(--accent)"}}/>
            : <XCircle size={14} strokeWidth={2} style={{color:"var(--danger)"}}/>}
          {toast.msg}
        </div>
      )}
    </>
  );
}
