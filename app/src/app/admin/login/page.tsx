"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Mail, Lock, KeyRound } from "lucide-react";
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
    setBusy(true); setError(null);
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
        const s = await fetch("/api/admin/2fa/setup", { method: "POST" });
        const sj = await s.json();
        if (!s.ok) throw new Error(sj.error || "שגיאת 2FA");
        setQr(sj.qr); setManualKey(sj.manualKey); setStep("setup");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally { setBusy(false); }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const endpoint = step === "setup" ? "/api/admin/2fa/enable" : "/api/admin/2fa/verify";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "הקוד שגוי");
      router.push("/admin"); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally { setBusy(false); }
  }

  return (
    <div className={`${styles.authWrap} ${styles.root}`}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <div className={styles.authLogoIcon}>
            <Activity size={20} color="#0a1a10" strokeWidth={2.5} />
          </div>
        </div>

        {step === "login" && (
          <form onSubmit={submitLogin}>
            <h1 className={styles.authTitle}>כניסת מנהל</h1>
            <p className={styles.authSub}>פאנל ניהול מאובטח — Robert</p>
            <div className={styles.field}>
              <label className={styles.label}>אימייל</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t4)" }}>
                  <Mail size={15} strokeWidth={1.8} />
                </span>
                <input className={styles.input} style={{ paddingRight: 36 }}
                  type="email" value={email} dir="ltr"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com" required autoComplete="email" />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>סיסמה</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t4)" }}>
                  <Lock size={15} strokeWidth={1.8} />
                </span>
                <input className={styles.input} style={{ paddingRight: 36 }}
                  type="password" value={password} dir="ltr"
                  onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password" />
              </div>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`} disabled={busy}>
              {busy ? "מתחבר…" : "המשך"}
            </button>
            {error && <div className={styles.errMsg}>{error}</div>}
          </form>
        )}

        {step === "setup" && (
          <form onSubmit={submitCode}>
            <h1 className={styles.authTitle}>הגדרת אימות דו-שלבי</h1>
            <p className={styles.authSub}>סרוק עם Google Authenticator</p>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.qr} src={qr} alt="QR" width={220} height={220} />
            )}
            {manualKey && (
              <>
                <div className={styles.authDivider}><span className={styles.authDividerText}>או הזן ידנית</span></div>
                <div className={styles.manualKey}>{manualKey}</div>
              </>
            )}
            <div className={styles.field}>
              <label className={styles.label}>קוד מ-Google Authenticator</label>
              <input className={`${styles.input} ${styles.codeInput}`} value={code} dir="ltr"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" inputMode="numeric" maxLength={6} required autoFocus />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
              disabled={busy || code.length !== 6}>
              {busy ? "מפעיל…" : "הפעל 2FA והיכנס"}
            </button>
            {error && <div className={styles.errMsg}>{error}</div>}
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={submitCode}>
            <h1 className={styles.authTitle}>קוד אימות</h1>
            <p className={styles.authSub}>הזן את הקוד מ-Google Authenticator</p>
            <div className={styles.field}>
              <label className={styles.label}>
                <KeyRound size={13} strokeWidth={2} style={{ display: "inline", marginLeft: 5 }} />
                קוד בן 6 ספרות
              </label>
              <input className={`${styles.input} ${styles.codeInput}`} value={code} dir="ltr"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" inputMode="numeric" maxLength={6} required autoFocus />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
              disabled={busy || code.length !== 6}>
              {busy ? "מאמת…" : "כניסה"}
            </button>
            {error && <div className={styles.errMsg}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
