"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";
import { scoped } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import ThemeToggle from "@/components/ThemeToggle";

const c = scoped(styles);

const LogoMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8l4 4-4 4" />
  </svg>
);

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, ToastHost } = useToast();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.email.trim() || !form.password) {
      toast("נא להזין אימייל וסיסמה");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast("התחברת בהצלחה — מעביר אותך…");
        router.push(redirect);
        router.refresh();
        return;
      }
      toast(d.error || "האימייל או הסיסמה שגויים");
    } catch {
      toast("אין חיבור לשרת — נסה שוב");
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${redirect}` },
      });
      if (error) toast("התחברות Google אינה זמינה כרגע");
    } catch {
      toast("התחברות Google אינה זמינה כרגע");
    }
  }

  return (
    <div className={styles.login}>
      <ToastHost />

      {/* top bar with back-to-home + theme toggle */}
      <div className={c("lg-top")}>
        <Link href="/" className={c("lg-back")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          לדף הבית
        </Link>
        <ThemeToggle />
      </div>

      <div className={c("lg-wrap")}>
        <form className={c("lg-card")} onSubmit={doLogin}>
          <div className={c("lg-logo")}>
            <div className={c("lg-logo-mark")}>
              <LogoMark />
            </div>
            <div className={c("lg-logo-name")}>
              Robert<span>.</span>
            </div>
          </div>

          <div className={c("lg-title")}>ברוך שובך 👋</div>
          <div className={c("lg-sub")}>התחבר לאזור האישי שלך</div>

          <div className={c("fg")}>
            <label className={c("fl")}>אימייל</label>
            <input
              className={c("fi")}
              type="email"
              autoComplete="email"
              placeholder="israel@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className={c("fg")}>
            <div className={c("fl-row")}>
              <label className={c("fl")}>סיסמה</label>
              <button type="button" className={c("lg-link-sm")} onClick={() => toast("קישור לאיפוס סיסמה נשלח לאימייל שלך")}>
                שכחת סיסמה?
              </button>
            </div>
            <div className={c("fi-pw")}>
              <input
                className={c("fi")}
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="הסיסמה שלך"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" className={c("pw-eye")} onClick={() => setShowPw((s) => !s)} aria-label="הצג סיסמה">
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>

          <button className={c("btn btn-primary")} type="submit" disabled={loading}>
            {loading ? "מתחבר…" : "התחבר"}
          </button>

          <div className={c("divd")}>
            <span>או</span>
          </div>

          <button className={c("btn btn-outline")} type="button" onClick={googleLogin}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            המשך עם Google
          </button>

          <div className={c("lg-signup")}>
            אין לך חשבון עדיין? <Link href="/onboarding">הרשמה חינם</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
