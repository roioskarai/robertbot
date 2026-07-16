"use client";

import { useEffect, useState } from "react";
import { Wrench, Power } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import Modal from "@/components/ui/Modal";

interface State {
  enabled: boolean;
  message?: string;
  etaText?: string;
}

export default function MaintenanceCard() {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [etaText, setEtaText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system/maintenance")
      .then((r) => r.json())
      .then((s: State) => {
        setEnabled(Boolean(s.enabled));
        setMessage(s.message ?? "");
        setEtaText(s.etaText ?? "");
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function save(nextEnabled: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/system/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled, message, etaText }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ text: json.error || "השמירה נכשלה", ok: false });
        return;
      }
      // Reflect the server's response, not the optimistic request — keeps the
      // UI honest about what's actually persisted in the DB.
      setEnabled(Boolean(json.enabled));
      setMessage(json.message ?? "");
      setEtaText(json.etaText ?? "");
      setMsg({ text: json.enabled ? "✓ מצב תחזוקה הופעל" : "✓ מצב תחזוקה כובה", ok: true });
    } catch {
      setMsg({ text: "השמירה נכשלה", ok: false });
    } finally {
      setBusy(false);
    }
  }

  // Turning ON locks customers out → confirm first. Turning OFF / saving text is immediate.
  function onPrimary() {
    if (!enabled) setConfirmOpen(true);
    else save(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 18 }}>
        <div className={styles.row} style={{ gap: 10 }}>
          <div className={`${styles.statIconWrap} ${enabled ? styles.warning : ""}`}>
            <Wrench size={16} strokeWidth={2} />
          </div>
          <div>
            <div className={styles.strong}>מצב תחזוקה</div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                marginTop: 2,
                color: enabled ? "var(--warning)" : "var(--success)",
              }}
            >
              {!loaded ? "טוען…" : enabled ? "פעיל — האתר סגור ללקוחות" : "כבוי — האתר פתוח"}
            </div>
          </div>
        </div>
        <span className={`${styles.badge} ${enabled ? styles.badgeTrial : styles.badgeActive}`}>
          {enabled ? "בתחזוקה" : "פעיל"}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>הודעה ללקוח (אופציונלי)</label>
        <textarea
          className={styles.input}
          rows={3}
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="אנחנו מבצעים עבודות תחזוקה קצרות. נחזור עוד מעט — תודה על הסבלנות."
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>זמן חזרה משוער (אופציונלי)</label>
        <input
          className={styles.input}
          value={etaText}
          maxLength={120}
          onChange={(e) => setEtaText(e.target.value)}
          placeholder="לדוגמה: תוך כשעה / היום ב-18:00"
        />
      </div>

      <div className={styles.row} style={{ gap: 8 }}>
        <button
          className={`${styles.btn} ${enabled ? styles.btnDanger : styles.btnPrimary}`}
          onClick={onPrimary}
          disabled={busy || !loaded}
        >
          <Power size={14} strokeWidth={2} />
          {enabled ? "כבה תחזוקה" : "הפעל תחזוקה"}
        </button>
        {enabled && (
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => save(true)}
            disabled={busy}
            title="עדכן את ההודעה/זמן החזרה בלי לכבות"
          >
            שמור הודעה
          </button>
        )}
      </div>

      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
            background: msg.ok ? "var(--success-bg)" : "var(--danger-bg)",
            color: msg.ok ? "var(--success)" : "var(--danger)",
          }}
        >
          {msg.text}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="הפעלת מצב תחזוקה"
        footer={
          <>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setConfirmOpen(false)}>
              ביטול
            </button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => {
                setConfirmOpen(false);
                save(true);
              }}
              disabled={busy}
            >
              הפעל תחזוקה
            </button>
          </>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.6, color: "var(--t2)" }}>
          לקוחות <strong>לא יוכלו להיכנס לאתר</strong> ויראו מסך תחזוקה.
          <br />
          פאנל האדמין, הבוטים ותהליכי הרקע (webhooks, cron) <strong>ממשיכים לעבוד כרגיל</strong>.
        </p>
      </Modal>
    </div>
  );
}
