"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Cpu, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

interface Run {
  id: string; agent: string; status: string; mode: string;
  summary: string|null; tokens: number; created_at: string;
}

const statusIcon = (s: string) => {
  if (s==="success") return <CheckCircle size={14} strokeWidth={2} style={{color:"var(--success)"}}/>;
  if (s==="error")   return <XCircle     size={14} strokeWidth={2} style={{color:"var(--danger)"}}/>;
  return <Clock size={14} strokeWidth={2} style={{color:"var(--warning)"}}/>;
};

const statusClass = (s: string) =>
  s==="success"?styles.badgeActive:s==="error"?styles.badgeCancelled:styles.badgeTrial;

function SkRow() {
  return (
    <tr>
      {[100,90,70,70,200,70].map((w,i)=>(
        <td key={i}><div className={`${styles.skeleton} ${styles.skBlock}`} style={{width:w}}/></td>
      ))}
    </tr>
  );
}

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

      {/* Runs table */}
      <div className={styles.card} style={{padding:0, overflow:"hidden"}}>
        <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border)"}}>
          <div className={styles.cardTitle} style={{margin:0}}>יומן ריצות (100 אחרונות)</div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr><th>תאריך</th><th>סוכן</th><th>מצב</th><th>סטטוס</th><th>סיכום</th><th style={{textAlign:"center"}}>טוקנים</th></tr>
            </thead>
            <tbody>
              {loading && [0,1,2,3,4].map(i=><SkRow key={i}/>)}
              {!loading && runs.length===0 && (
                <tr><td colSpan={6}><div className={styles.tableEmpty}>אין ריצות עדיין</div></td></tr>
              )}
              {!loading && runs.map(r=>(
                <tr key={r.id}>
                  <td className={styles.muted} style={{fontSize:12,whiteSpace:"nowrap"}}>
                    {new Date(r.created_at).toLocaleString("he-IL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
                  </td>
                  <td className={styles.strong} style={{fontSize:13}}>{r.agent}</td>
                  <td><span className={`${styles.badge} ${r.mode==="live"?styles.badgeActive:styles.badgeTrial}`}>{r.mode}</span></td>
                  <td>
                    <div className={styles.row} style={{gap:5}}>
                      {statusIcon(r.status)}
                      <span className={`${styles.badge} ${statusClass(r.status)}`}>{r.status}</span>
                    </div>
                  </td>
                  <td style={{maxWidth:280, fontSize:12, color:"var(--t3)"}}>{r.summary||"—"}</td>
                  <td style={{textAlign:"center"}} className={styles.mono}>{r.tokens?.toLocaleString()||"0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
