"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../login/login.module.css";
import { scoped } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import ThemeToggle from "@/components/ThemeToggle";

const c = scoped(styles);

type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [phase, setPhase] = useState<Phase>("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // On load, the /auth/callback handler has already exchanged the code for a
  // session cookie. We just confirm a (recovery) session exists.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("error")) {
      setPhase("invalid");
      return;
    }
    const supabase = createClient();
    let done = false;
    supabase.auth.getSession().then(({ data }) => {
      if (done) return;
      done = true;
      setPhase(data.session ? "ready" : "invalid");
    });
    // Safety net in case getSession hangs.
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        setPhase("invalid");
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      toast("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (pw !== pw2) {
      toast("הסיסמאות אינן תואמות");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        toast("עדכון הסיסמה נכשל — בקש קישור חדש ונסה שוב");
        setLoading(false);
        return;
      }
      setPhase("done");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch {
      toast("אין חיבור לשרת — נסה שוב");
      setLoading(false);
    }
  }

  return (
    <div className={styles.login}>
      <ToastHost />

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
        <div className={c("lg-card")}>
          <Link href="/" className={c("lg-logo")} style={{ textDecoration: "none" }}>
            <div className={c("lg-logo-name")}>
              Robert<span>.</span>
            </div>
          </Link>

          {phase === "checking" && (
            <>
              <div className={c("lg-title")}>רגע…</div>
              <div className={c("lg-sub")}>מאמתים את קישור האיפוס</div>
            </>
          )}

          {phase === "invalid" && (
            <>
              <div className={c("lg-title")}>הקישור אינו תקף</div>
              <div className={c("lg-sub")}>
                ייתכן שהקישור פג תוקף, כבר נוצל, או נפתח בדפדפן אחר. בקש קישור חדש מדף ההתחברות.
              </div>
              <Link href="/login" className={c("btn btn-primary")} style={{ marginTop: 10, display: "block", textAlign: "center" }}>
                חזרה להתחברות
              </Link>
            </>
          )}

          {phase === "done" && (
            <>
              <div className={c("lg-title")}>הסיסמה עודכנה ✓</div>
              <div className={c("lg-sub")}>מעבירים אותך לאזור האישי…</div>
            </>
          )}

          {phase === "ready" && (
            <form onSubmit={submit}>
              <div className={c("lg-title")}>סיסמה חדשה</div>
              <div className={c("lg-sub")}>בחר סיסמה חדשה לחשבון שלך</div>

              <div className={c("fg")}>
                <label className={c("fl")}>סיסמה חדשה</label>
                <div className={c("fi-pw")}>
                  <input
                    className={c("fi")}
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="לפחות 8 תווים"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
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

              <div className={c("fg")}>
                <label className={c("fl")}>אימות סיסמה</label>
                <input
                  className={c("fi")}
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="הקלד את הסיסמה שוב"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </div>

              <button className={c("btn btn-primary")} type="submit" disabled={loading}>
                {loading ? "שומר…" : "עדכן סיסמה"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
