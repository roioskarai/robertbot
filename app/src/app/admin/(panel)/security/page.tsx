"use client";

import { useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

export default function AdminSecurity() {
  const [me, setMe] = useState<{ email: string; totp_enabled: boolean; last_login_at: string | null } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [tfaMsg, setTfaMsg] = useState<string | null>(null);
  const [tfaBusy, setTfaBusy] = useState(false);

  // password change state
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  function loadMe() {
    fetch("/api/admin/me").then((r) => r.json()).then(setMe);
  }
  useEffect(loadMe, []);

  async function startReconfig() {
    setTfaBusy(true); setTfaMsg(null);
    const res = await fetch("/api/admin/2fa/setup", { method: "POST" });
    const json = await res.json();
    setTfaBusy(false);
    if (!res.ok) { setTfaMsg(json.error || "שגיאה"); return; }
    setQr(json.qr); setManualKey(json.manualKey);
  }

  async function confirmTotp() {
    setTfaBusy(true); setTfaMsg(null);
    const res = await fetch("/api/admin/2fa/enable", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setTfaBusy(false);
    if (!res.ok) { setTfaMsg(json.error || "הקוד שגוי"); return; }
    setTfaMsg("✓ 2FA עודכן בהצלחה"); setQr(null); setManualKey(null); setCode(""); loadMe();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null); setPwOk(false);
    if (newPw !== confirmPw) { setPwMsg("הסיסמאות אינן תואמות"); return; }
    if (newPw.length < 8) { setPwMsg("הסיסמה חייבת להכיל לפחות 8 תווים"); return; }
    setPwBusy(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) { setPwMsg(json.error || "שגיאה"); return; }
      setPwOk(true); setPwMsg("✓ הסיסמה שונתה בהצלחה");
      setCurPw(""); setNewPw(""); setConfirmPw("");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <>
      <h1 className={styles.h1}>אבטחה ו-2FA</h1>
      <p className={styles.sub}>ניהול סיסמה ואימות דו-שלבי</p>

      <div className={`${styles.grid} ${styles.grid2}`} style={{ alignItems: "start" }}>

        {/* ── שינוי סיסמה ── */}
        <div className={styles.card}>
          <div className={styles.statLabel} style={{ marginBottom: 16 }}>שינוי סיסמה</div>
          <form onSubmit={changePassword}>
            <div className={styles.field}>
              <label className={styles.label}>סיסמה נוכחית</label>
              <input className={styles.input} type="password" value={curPw} dir="ltr"
                onChange={(e) => setCurPw(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>סיסמה חדשה (לפחות 8 תווים)</label>
              <input className={styles.input} type="password" value={newPw} dir="ltr"
                onChange={(e) => setNewPw(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>אישור סיסמה חדשה</label>
              <input className={styles.input} type="password" value={confirmPw} dir="ltr"
                onChange={(e) => setConfirmPw(e.target.value)} required autoComplete="new-password" />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.fullBtn}`}
              type="submit" disabled={pwBusy}>
              {pwBusy ? "מעדכן…" : "שנה סיסמה"}
            </button>
            {pwMsg && (
              <div className={styles.statHint} style={{ marginTop: 12, textAlign: "center",
                color: pwOk ? "#4ade80" : "#f87171" }}>{pwMsg}</div>
            )}
          </form>
        </div>

        {/* ── 2FA ── */}
        <div className={styles.card}>
          <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div className={styles.statLabel}>אימות דו-שלבי (Google Authenticator)</div>
              <div style={{ fontSize: 16, fontWeight: 700,
                color: me?.totp_enabled ? "#4ade80" : "#fde047", marginTop: 4 }}>
                {me ? (me.totp_enabled ? "✓ פעיל ומאובטח" : "לא מוגדר — מומלץ להפעיל") : "טוען…"}
              </div>
            </div>
            <span className={`${styles.badge} ${me?.totp_enabled ? styles.badgeActive : styles.badgeTrial}`}>
              {me?.totp_enabled ? "מאובטח" : "ממתין"}
            </span>
          </div>

          {me?.last_login_at && (
            <div className={styles.muted} style={{ marginBottom: 16 }}>
              כניסה אחרונה: {new Date(me.last_login_at).toLocaleString("he-IL")}
            </div>
          )}

          {!qr && (
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.fullBtn}`}
              onClick={startReconfig} disabled={tfaBusy}>
              {me?.totp_enabled ? "הגדר מחדש את 2FA" : "הפעל 2FA"}
            </button>
          )}

          {qr && (
            <div style={{ marginTop: 8 }}>
              <p className={styles.muted} style={{ textAlign: "center", marginBottom: 8 }}>
                סרוק עם Google Authenticator:
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.qr} src={qr} alt="QR" width={220} height={220} />
              {manualKey && (
                <>
                  <p className={styles.muted} style={{ textAlign: "center", margin: "8px 0 4px" }}>
                    או הזן ידנית:
                  </p>
                  <div className={styles.manualKey}>{manualKey}</div>
                </>
              )}
              <input className={`${styles.input} ${styles.codeInput}`} value={code} dir="ltr"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" inputMode="numeric" maxLength={6} />
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.fullBtn}`}
                style={{ marginTop: 12 }}
                onClick={confirmTotp} disabled={tfaBusy || code.length !== 6}>
                אשר והפעל
              </button>
            </div>
          )}

          {tfaMsg && (
            <div className={styles.statHint} style={{ marginTop: 14, textAlign: "center" }}>
              {tfaMsg}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
