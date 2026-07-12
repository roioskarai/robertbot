"use client";

import { useRef, useState } from "react";
import { Sparkles, Send, ChevronDown, ChevronUp, User } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

interface Turn {
  role: "user" | "assistant";
  text: string;
  facts?: Record<string, string | number>;
  rows?: Record<string, unknown>[];
  tokens?: number;
}

const SUGGESTIONS = [
  "כמה כסף נכנס החודש?",
  "כמה נרשמו ב-7 הימים האחרונים?",
  "מי עומד לעזוב?",
  "הבוטים הכי פעילים",
  "כמה הודעות נשלחו החודש?",
  "הצעות סוכנים ממתינות",
];

export default function AdminAssistant() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [tokenTotal, setTokenTotal] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setQ("");
    setTurns((t) => [...t, { role: "user", text }]);
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTurns((t) => [...t, { role: "assistant", text: d.error || "אירעה שגיאה" }]);
      } else {
        setTurns((t) => [...t, { role: "assistant", text: d.answer, facts: d.facts, rows: d.rows, tokens: d.tokens }]);
        setTokenTotal((n) => n + (d.tokens ?? 0));
      }
    } catch {
      setTurns((t) => [...t, { role: "assistant", text: "שגיאת רשת" }]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>עוזר AI</h1>
          <p className={styles.pageDesc}>שאל שאלות על המערכת בשפה חופשית — העוזר עונה מנתונים אמיתיים בלבד.</p>
        </div>
        {tokenTotal > 0 && (
          <div className={styles.pageActions}>
            <span className={styles.muted} style={{ fontSize: 12 }}>טוקנים בשיחה: {tokenTotal.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
        <div ref={listRef} style={{ maxHeight: "52vh", overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {turns.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 12px" }}>
              <Sparkles size={28} strokeWidth={1.5} style={{ color: "var(--accent)", marginBottom: 10 }} />
              <div className={styles.strong} style={{ fontSize: 14, marginBottom: 6 }}>שאל אותי כל דבר על המערכת</div>
              <div className={styles.muted} style={{ fontSize: 12.5 }}>בחר שאלה מוצעת למטה או כתוב בעצמך</div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={styles.row} style={{ alignItems: "flex-start", gap: 10, justifyContent: t.role === "user" ? "flex-start" : "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: t.role === "user" ? "var(--surface-3)" : "var(--accent-soft)",
                color: t.role === "user" ? "var(--t3)" : "var(--accent)",
              }}>
                {t.role === "user" ? <User size={14} strokeWidth={2} /> : <Sparkles size={14} strokeWidth={2} />}
              </div>
              <div className={styles.flex1}>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap", color: t.role === "user" ? "var(--t2)" : "var(--t1)" }}>
                  {t.text}
                </div>
                {(t.facts || t.rows) && (
                  <div style={{ marginTop: 6 }}>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setExpanded(expanded === i ? null : i)}>
                      {expanded === i ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />} הצג נתונים
                    </button>
                    {expanded === i && (
                      <div style={{ marginTop: 8, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                        {t.facts && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: t.rows?.length ? 10 : 0 }}>
                            {Object.entries(t.facts).map(([k, v]) => (
                              <div key={k} className={styles.row} style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                                <span className={styles.muted}>{k}</span>
                                <span className={styles.strong}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {t.rows && t.rows.length > 0 && (
                          <div className={styles.tableScroll}>
                            <table className={styles.table}>
                              <thead><tr>{Object.keys(t.rows[0]).map((h) => <th key={h}>{h}</th>)}</tr></thead>
                              <tbody>
                                {t.rows.slice(0, 50).map((r, ri) => (
                                  <tr key={ri}>{Object.keys(t.rows![0]).map((h) => <td key={h} style={{ fontSize: 12.5 }}>{String(r[h] ?? "—")}</td>)}</tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className={styles.row} style={{ gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={14} strokeWidth={2} />
              </div>
              <span className={styles.muted} style={{ fontSize: 13 }}>חושב…</span>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {turns.length === 0 && (
          <div className={styles.row} style={{ gap: 6, flexWrap: "wrap", padding: "0 18px 12px" }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => ask(s)} disabled={busy}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className={styles.row} style={{ gap: 8, padding: 14, borderTop: "1px solid var(--border)" }}>
          <input
            className={styles.input}
            style={{ flex: 1 }}
            placeholder="שאל שאלה על המערכת…"
            value={q}
            maxLength={500}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(q); }}
            disabled={busy}
          />
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => ask(q)} disabled={busy || !q.trim()}>
            <Send size={14} strokeWidth={2} /> שלח
          </button>
        </div>
      </div>
    </>
  );
}
