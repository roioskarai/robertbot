"use client";

import { useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

export default function AdminSecurity() {
  const [me, setMe] = useState<{ email: string; totp_enabled: boolean; last_login_at: string | null } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function loadMe() {
    fetch("/api/admin/me").then((r) => r.json()).then(setMe);
  }
  useEffect(loadMe, []);

  async function startReconfig() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/2fa/setup", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(json.error || "שגיאה"); return; }
    setQr(json.qr); setManualKey(json.manualKey);
  }

  async function confirm() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/2fa/enable", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(json.error || "הקוד שגוי"); return; }
    setMsg("✓ 2FA עודכן בהצלחה"); setQr(null); setManualKey(null); setCode(""); loadMe();
  }

  return (
    <>
      <h1 className={styles.h1}>אבטחה ו-2FA</h1>
      <p className={styles.sub}>אימות דו-שלבי עם Google Authenticator</p>

      <div className={styles.card} style={{ maxWidth: 460 }}>
        <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className={styles.statLabel}>סטטוס 2FA</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: me?.totp_enabled ? "#4ade80" : "#fde047" }}>
              {me ? (me.totp_enabled ? "✓ פעיל ומאובטח" : "לא מוגדר") : "טוען…"}
            </div>
          </div>
          <span className={`${styles.badge} ${me?.totp_enabled ? styles.badgeActive : styles.badgeTrial}`}>
            {me?.totp_enabled ? "מאובטח" : "דורש הגדרה"}
          </span>
        </div>

        {me?.last_login_at && (
          <div className={styles.muted} style={{ marginBottom: 16 }}>
            כניסה אחרונה: {new Date(me.last_login_at).toLocaleString("he-IL")}
          </div>
        )}

        {!qr && (
          <button className={`${styles.btn} ${styles.btnGhost} ${styles.fullBtn}`} onClick={startReconfig} disabled={busy}>
            {me?.totp_enabled ? "הגדר מחדש את 2FA" : "הפעל 2FA"}
          </button>
        )}

        {qr && (
          <div style={{ marginTop: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.qr} src={qr} alt="QR" width={220} height={220} />
            {manualKey && <div className={styles.manualKey}>{manualKey}</div>}
            <input className={`${styles.input} ${styles.codeInput}`} value={code} dir="ltr"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" inputMode="numeric" maxLength={6} />
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.fullBtn}`} style={{ marginTop: 12 }}
              onClick={confirm} disabled={busy || code.length !== 6}>אשר והפעל</button>
          </div>
        )}

        {msg && <div className={styles.statHint} style={{ marginTop: 14, textAlign: "center" }}>{msg}</div>}
      </div>
    </>
  );
}
