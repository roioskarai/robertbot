"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

interface Run {
  id: string;
  agent: string;
  status: string;
  mode: string;
  summary: string | null;
  tokens: number;
  created_at: string;
}

export default function AdminAgents() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/agents");
    const json = await res.json();
    setRuns(json.runs ?? []);
    setAvailable(json.available ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(agent: string, mode: "dry" | "live") {
    setBusy(agent + mode);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, mode }),
      });
      const json = await res.json();
      setMsg(res.ok ? `✓ ${agent} (${mode}) הורץ בהצלחה` : json.error || "הרצה נכשלה");
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h1 className={styles.h1}>סוכני AI</h1>
      <p className={styles.sub}>הפעלה וניטור של סוכני התפעול (draft-only)</p>

      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div className={styles.statLabel}>הרצה ידנית</div>
        <div className={styles.toolbar} style={{ marginBottom: 0, marginTop: 10 }}>
          {available.map((a) => (
            <div key={a} className={styles.row}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a}</span>
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: "5px 10px" }}
                disabled={busy !== null} onClick={() => run(a, "dry")}>טיוטה</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: "5px 10px" }}
                disabled={busy !== null} onClick={() => run(a, "live")}>חי</button>
            </div>
          ))}
        </div>
        {msg && <div className={styles.statHint} style={{ marginTop: 12 }}>{msg}</div>}
      </div>

      <div className={styles.card} style={{ padding: 0, overflowX: "auto" }}>
        <table className={styles.table}>
          <thead><tr><th>תאריך</th><th>סוכן</th><th>מצב</th><th>סטטוס</th><th>סיכום</th><th>טוקנים</th></tr></thead>
          <tbody>
            {runs.length === 0 && <tr><td colSpan={6} className={styles.muted}>אין ריצות עדיין</td></tr>}
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString("he-IL")}</td>
                <td>{r.agent}</td>
                <td>{r.mode}</td>
                <td><span className={`${styles.badge} ${r.status === "success" ? styles.badgeActive : r.status === "skipped" ? styles.badgeTrial : styles.badgeCancelled}`}>{r.status}</span></td>
                <td style={{ maxWidth: 320 }}>{r.summary ?? "—"}</td>
                <td>{r.tokens?.toLocaleString() ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
