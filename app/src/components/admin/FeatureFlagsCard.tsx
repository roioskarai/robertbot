"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

interface FlagState {
  key: string;
  labelHe: string;
  descHe: string;
  enabled: boolean;
  defaultOn: boolean;
}

export default function FeatureFlagsCard() {
  const [flags, setFlags] = useState<FlagState[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function load() {
    fetch("/api/admin/system/flags")
      .then((r) => r.json())
      .then((j) => setFlags(j.flags ?? []))
      .catch(() => setFlags([]));
  }
  useEffect(load, []);

  async function toggle(key: string, enabled: boolean) {
    setBusyKey(key);
    setMsg(null);
    // optimistic
    setFlags((cur) => cur?.map((f) => (f.key === key ? { ...f, enabled } : f)) ?? cur);
    try {
      const res = await fetch("/api/admin/system/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ text: json.error || "השמירה נכשלה", ok: false });
        load(); // revert to server truth
        return;
      }
      setMsg({ text: "✓ נשמר", ok: true });
    } catch {
      setMsg({ text: "השמירה נכשלה", ok: false });
      load();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.row} style={{ gap: 10, marginBottom: 18 }}>
        <div className={styles.statIconWrap}>
          <Flag size={16} strokeWidth={2} />
        </div>
        <div>
          <div className={styles.strong}>דגלי פיצ׳ר</div>
          <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 2 }}>
            הפעלה/כיבוי של יכולות בלי לגעת בקוד
          </div>
        </div>
      </div>

      {flags === null ? (
        <div style={{ color: "var(--t4)", fontSize: 13 }}>טוען…</div>
      ) : flags.length === 0 ? (
        <div style={{ color: "var(--t4)", fontSize: 13 }}>אין דגלים מוגדרים.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {flags.map((f) => (
            <div
              key={f.key}
              className={styles.row}
              style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}
            >
              <div style={{ flex: 1 }}>
                <div className={styles.strong} style={{ fontSize: 13.5 }}>{f.labelHe}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2, lineHeight: 1.5 }}>{f.descHe}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={f.enabled}
                aria-label={f.labelHe}
                disabled={busyKey === f.key}
                onClick={() => toggle(f.key, !f.enabled)}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  border: "none",
                  cursor: busyKey === f.key ? "wait" : "pointer",
                  padding: 3,
                  background: f.enabled ? "var(--success)" : "var(--surface-3)",
                  transition: "background .15s",
                  display: "flex",
                  justifyContent: f.enabled ? "flex-start" : "flex-end",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,.2)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
