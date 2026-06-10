"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

type Step = "login" | "setup" | "verify";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ההתחברות נכשלה");
      if (json.needs2fa) {
        setStep("verify");
      } else {
        // First time — generate the enrollment QR.
        const setupRes = await fetch("/api/admin/2fa/setup", { method: "POST" });
        const setupJson = await setupRes.json();
        if (!setupRes.ok) throw new Error(setupJson.error || "הגדרת 2FA נכשלה");
        setQr(setupJson.qr);
        setManualKey(setupJson.manualKey);
        setStep("setup");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const endpoint = step === "setup" ? "/api/admin/2fa/enable" : "/api/admin/2fa/verify";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "הקוד שגוי");
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.authWrap}>
      <div className={styles.authCard}>
        {step === "login" && (
          <form onSubmit={submitLogin}>
            <h1 className={styles.authTitle}>כניסת מנהל</h1>
            <p className={styles.authSub}>Robert — פאנל ניהול מאובטח</p>
            <div className={styles.field}>
              <label className={styles.label}>אימייל</label>
              <input className={styles.input} type="email" value={email} dir="ltr"
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>סיסמה</label>
              <input className={styles.input} type="password" value={password} dir="ltr"
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.fullBtn}`} disabled={busy}>
              {busy ? "מתחבר…" : "המשך"}
            </button>
            {error && <div className={styles.error}>{error}</div>}
          </form>
        )}

        {step === "setup" && (
          <form onSubmit={submitCode}>
            <h1 className={styles.authTitle}>הגדרת אימות דו-שלבי</h1>
            <p className={styles.authSub}>סרוק עם Google Authenticator והזן את הקוד</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr && <img className={styles.qr} src={qr} alt="QR" width={220} height={220} />}
            {manualKey && (
              <>
                <p className={styles.muted} style={{ textAlign: "center", marginBottom: 6 }}>או הזן ידנית:</p>
                <div className={styles.manualKey}>{manualKey}</div>
              </>
            )}
            <div className={styles.field}>
              <input className={`${styles.input} ${styles.codeInput}`} value={code} dir="ltr"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" inputMode="numeric" maxLength={6} required autoFocus />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.fullBtn}`} disabled={busy}>
              {busy ? "מאמת…" : "הפעל 2FA והיכנס"}
            </button>
            {error && <div className={styles.error}>{error}</div>}
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={submitCode}>
            <h1 className={styles.authTitle}>קוד אימות</h1>
            <p className={styles.authSub}>הזן את הקוד מ-Google Authenticator</p>
            <div className={styles.field}>
              <input className={`${styles.input} ${styles.codeInput}`} value={code} dir="ltr"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" inputMode="numeric" maxLength={6} required autoFocus />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.fullBtn}`} disabled={busy}>
              {busy ? "מאמת…" : "כניסה"}
            </button>
            {error && <div className={styles.error}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
