"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./cancel.module.css";
import { scoped } from "@/lib/cx";
import { LogoInk } from "@/components/logo";
import { PRICING, PLAN_LIMITS } from "@/lib/plans";
import type { SubscriptionState } from "@/lib/subscription";
import { useToast } from "@/components/Toast";

const c = scoped(styles);

// Reference "cost of a human rep" used only in the price-objection comparison.
const HUMAN_REP_COST = 5000;

type Reason = "price" | "use" | "hard" | "missing" | "competitor" | "other";
type ScreenId = "s1" | "s2" | "s3" | "s4" | "s5";

const REASONS: { key: Reason; text: string }[] = [
  { key: "price", text: "המחיר יקר מדי" },
  { key: "use", text: "אני לא משתמש מספיק" },
  { key: "hard", text: "קשה לי להגדיר את הבוט" },
  { key: "missing", text: "חסר לי פיצ'ר מסוים" },
  { key: "competitor", text: "עברתי לשירות אחר" },
  { key: "other", text: "סיבה אחרת" },
];

const OFFER_TITLES: Record<Reason, string> = {
  price: "רגע — חשבת כמה Robert חוסך לך?",
  use: "לא משתמש? עצור את החיוב",
  hard: "קשה להגדיר? אנחנו נעזור לך",
  missing: "חסר פיצ'ר? ספר לנו",
  competitor: "עברת למתחרה?",
  other: "נצטער לשמוע",
};
const ACCEPTED_TITLES: Record<Reason, string> = {
  price: "עברת למסלול בסיסי!",
  use: "החיוב נעצר!",
  hard: "תודה — צוות התמיכה כאן בשבילך!",
  missing: "המשוב נשלח — תודה!",
  competitor: "עברת למסלול בסיסי",
  other: "המשוב נשלח — תודה!",
};
const ACCEPTED_SUBS: Record<Reason, string> = {
  price: `המסלול שלך שונה ל-₪${PRICING.basic.monthly}/חודש. הבוט ממשיך לעבוד.`,
  use: "החיוב נעצר וההגדרות שלך נשמרות. תוכל לחדש את המנוי בכל עת.",
  hard: "אנחנו כאן אם תצטרך עזרה נוספת.",
  missing: "נעדכן אותך כשהפיצ'ר יהיה מוכן.",
  competitor: "המסלול שלך שונה. הבוט ממשיך לעבוד.",
  other: "אנחנו תמיד שמחים לשמוע.",
};

function CancelInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, ToastHost } = useToast();
  const [screen, setScreenState] = useState<ScreenId>("s1");
  const [reason, setReason] = useState<Reason | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  // Screens the user has legitimately reached — a deep-link / Back can only
  // land on one of these, never skip ahead to a terminal "done" screen.
  const reachedRef = useRef<Set<ScreenId>>(new Set<ScreenId>(["s1"]));

  // Navigate a funnel screen AND reflect it in the URL (?s=N) so browser
  // Back/Forward move between screens instead of leaving the page.
  function setScreen(id: ScreenId) {
    reachedRef.current.add(id);
    setScreenState(id);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("s", id.replace("s", ""));
    router.push(`/cancel?${sp.toString()}`);
  }

  // URL → screen (initial load, Back/Forward). Ignores screens not yet reached.
  useEffect(() => {
    const raw = searchParams.get("s");
    const target = (raw ? `s${raw}` : "s1") as ScreenId;
    const next = reachedRef.current.has(target) ? target : "s1";
    setScreenState((s) => (s === next ? s : next));
  }, [searchParams]);
  // Real subscription end date (from /api/analytics) — never a hardcoded date.
  const [endDate, setEndDate] = useState<string | null>(null);
  // Derived subscription state: a trial/cancelled user has nothing to cancel,
  // so we short-circuit the whole retention funnel with a clear message.
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  // Real usage stats for the "look what Robert did for you" panel (was fake).
  const [usage, setUsage] = useState<{ messages: number; closed: number } | null>(null);
  // Guards a double-submit and lets us show the REAL server outcome (never a
  // hardcoded "success" that could contradict what the billing API actually did).
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ title: string; sub: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (d.subscription) setSub(d.subscription as SubscriptionState);
        if (d.subscriptionEndsAt) setEndDate(new Date(d.subscriptionEndsAt).toLocaleDateString("he-IL"));
        setUsage({ messages: d.messagesThisMonth ?? 0, closed: d.closedThisMonth ?? 0 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // No active paid subscription → don't run the cancel funnel at all.
  const nothingToCancel = sub != null && !sub.isPaying;

  // Grammatical Hebrew for both the real-date and the no-date fallback.
  const stopText = endDate ? `ב-${endDate}` : "בסוף תקופת החיוב הנוכחית";
  const untilText = endDate ?? "סוף תקופת החיוב הנוכחית";

  function next() {
    if (!reason) {
      toast("בחר סיבה כדי להמשיך");
      return;
    }
    setScreen("s2");
  }

  // Fire-and-forget: record the free-text feedback without blocking the flow.
  function submitFeedback() {
    if (!reason) return;
    const text = feedbackText.trim();
    if (!text) return;
    fetch("/api/billing/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, text }),
    }).catch(() => {});
  }

  // Single billing call with honest result handling: returns the server's ok
  // flag + its Hebrew message/error. Never throws.
  async function callBilling(url: string, body?: unknown): Promise<{ ok: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await res.json().catch(() => ({}));
      return { ok: res.ok, message: d.message, error: d.error };
    } catch {
      return { ok: false, error: "אין חיבור לשרת — נסה שוב." };
    }
  }

  async function acceptOffer() {
    if (!reason || busy) return;
    // Feedback-only reasons touch no billing — record the text and thank.
    if (reason === "hard" || reason === "missing" || reason === "other") {
      submitFeedback();
      setOutcome({ title: ACCEPTED_TITLES[reason], sub: ACCEPTED_SUBS[reason] });
      setScreen("s5");
      return;
    }
    // competitor carries optional free-text too — capture it before the billing call.
    if (reason === "competitor") submitFeedback();
    setBusy(true);
    const r = reason === "use"
      ? await callBilling("/api/billing/pause")
      : await callBilling("/api/billing/downgrade", { plan: "basic" }); // price | competitor
    setBusy(false);
    if (!r.ok) {
      // Do NOT advance to a success screen when the server failed — the customer
      // must not believe a change happened that didn't.
      toast(r.error || "הפעולה נכשלה. נסה שוב או פנה לתמיכה.");
      return;
    }
    // Show the REAL server message (e.g. Grow cancels rather than pauses).
    setOutcome({ title: "הפעולה בוצעה", sub: r.message || ACCEPTED_SUBS[reason] });
    setScreen("s5");
  }

  async function confirmCancel() {
    if (busy) return;
    setBusy(true);
    const r = await callBilling("/api/billing/cancel");
    setBusy(false);
    if (!r.ok) {
      toast(r.error || "הביטול נכשל. נסה שוב או פנה לתמיכה.");
      return;
    }
    setOutcome({ title: "המנוי בוטל", sub: r.message || `המנוי בוטל. הבוט ימשיך לפעול עד ${untilText}.` });
    setScreen("s4");
  }

  const Nav = (
    <nav className={c("nav")}>
      <Link href="/" className={c("nav-logo")} style={{ display: "inline-flex", alignItems: "center" }}>
        <LogoInk variant="wordmark" style={{ height: 24, width: "auto", color: "var(--t1)" }} />
      </Link>
      <Link href="/dashboard" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>חזור ל-Dashboard</Link>
    </nav>
  );

  // Trial / already-cancelled users have no paid subscription to cancel — show a
  // clear message instead of a retention funnel that would misrepresent billing.
  if (nothingToCancel && sub) {
    const trialText =
      sub.status === "trial" && sub.trialEndsAt
        ? `אתה בתקופת ניסיון חינם — אין חיוב פעיל. הניסיון מסתיים ב-${new Date(sub.trialEndsAt).toLocaleDateString("he-IL")}, ואינך מחויב עד שתבחר מסלול.`
        : "אין לך מנוי פעיל בתשלום — אין מה לבטל. אתה יכול לבחור מסלול בכל עת מהאזור האישי.";
    return (
      <div className={styles.cancel}>
        {Nav}
        <div className={c("screen") + " " + styles.act}>
          <div className={c("card")} style={{ textAlign: "center" }}>
            <div className={c("card-icon")} style={{ background: "var(--green-p)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <div className={c("card-title")}>אין חיוב פעיל</div>
            <div className={c("card-sub")}>{trialText}</div>
            <button className={c("btn btn-primary")} onClick={() => router.push("/dashboard")} style={{ marginTop: 8 }}>חזור ל-Dashboard</button>
          </div>
        </div>
        <ToastHost />
      </div>
    );
  }

  return (
    <div className={styles.cancel}>
      {Nav}

      {/* S1 — WHY */}
      <div className={c("screen") + (screen === "s1" ? " " + styles.act : "")}>
        <div className={c("card")}>
          <div className={c("card-icon")} style={{ background: "#fee2e2" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <div className={c("card-title")}>רגע לפני שמבטלים...</div>
          <div className={c("card-sub")}>Robert עבד קשה בשבילך החודש. לפני שאתה הולך — ספר לנו למה.</div>
          {usage && (usage.messages > 0 || usage.closed > 0) && (
            <div className={c("stats-row")}>
              <div className={c("stat-box")}><div className={c("stat-n green")}>{usage.messages.toLocaleString()}</div><div className={c("stat-l")}>הודעות החודש</div></div>
              <div className={c("stat-box")}><div className={c("stat-n green")}>{usage.closed.toLocaleString()}</div><div className={c("stat-l")}>שיחות שנסגרו</div></div>
            </div>
          )}
          <div className={c("reasons")}>
            {REASONS.map((r) => (
              <div key={r.key} className={c("reason") + (reason === r.key ? " " + styles.sel : "")} onClick={() => setReason(r.key)}>
                <div className={c("reason-radio")}></div>
                <div className={c("reason-text")}>{r.text}</div>
              </div>
            ))}
          </div>
          <button className={c("btn btn-dark")} onClick={next}>המשך</button>
          <button className={c("btn btn-ghost")} onClick={() => router.push("/dashboard")}>חזור ל-Dashboard</button>
        </div>
      </div>

      {/* S2 — OFFER */}
      <div className={c("screen") + (screen === "s2" ? " " + styles.act : "")}>
        <div className={c("card")}>
          <button className={c("back-btn")} onClick={() => setScreen("s1")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            חזור
          </button>
          <div className={c("card-icon")} style={{ background: "var(--green-p)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </div>
          <div className={c("card-title")}>{reason ? OFFER_TITLES[reason] : ""}</div>
          <div className={c("card-sub")}>ספציפית בשבילך, הכנו הצעה שלא תרצה לפספס.</div>

          {reason === "price" && (
            <>
              <div className={c("offer-card")} style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}><span style={{ fontSize: 13, color: "#334155" }}>נציג שירות לקוחות</span><span style={{ fontSize: 15, fontWeight: 800, color: "#dc2626" }}>₪{HUMAN_REP_COST.toLocaleString("en-US")}+/חודש</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}><span style={{ fontSize: 13, color: "#334155" }}>Robert — מסלול מתקדם</span><span style={{ fontSize: 15, fontWeight: 800, color: "var(--green-d)" }}>₪{PRICING.pro.monthly}/חודש</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}><span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>החיסכון שלך</span><span style={{ fontSize: 18, fontWeight: 900, color: "var(--green-d)" }}>₪{(HUMAN_REP_COST - PRICING.pro.monthly).toLocaleString("en-US")}/חודש</span></div>
                </div>
              </div>
              <div className={c("down-card")} style={{ marginTop: 10 }}>
                <div className={c("down-title")}>⬇️ אפשרות: ירידה למסלול בסיסי</div>
                <div className={c("down-sub")}>₪{PRICING.basic.monthly}/חודש — בוט אחד, {PLAN_LIMITS.basic.messages} הודעות. הבוט ממשיך לענות ללקוחות.</div>
              </div>
            </>
          )}
          {reason === "use" && (
            <div className={c("pause-card")}>
              <div className={c("pause-title")}>⏸️ עצירת המנוי</div>
              <div className={c("pause-sub")}>החיוב ייפסק והבוט יושהה. ההגדרות שלך נשמרות — תוכל לחדש את המנוי בכל עת.</div>
            </div>
          )}
          {reason === "hard" && (
            <div className={c("offer-card")}>
              <div className={c("offer-badge")}>עזרה בהגדרה</div>
              <Link
                href="/dashboard?page=support"
                style={{ display: "block", background: "#0f172a", borderRadius: 10, height: 120, position: "relative", margin: "12px 0", textDecoration: "none" }}
                aria-label="פתח עזרה והדרכה בהגדרת הבוט"
              >
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 46, height: 46, background: "rgba(255,255,255,.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,.2)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </div>
                </div>
              </Link>
              <div className={c("offer-sub")}>צוות התמיכה יעזור לך להגדיר הכל — שם עסק, שירותים, שאלות נפוצות וחיבור וואטסאפ.</div>
            </div>
          )}
          {reason === "competitor" && (
            <div className={c("down-card")}>
              <div className={c("down-title")}>⬇️ עבור למסלול בסיסי — ₪{PRICING.basic.monthly}</div>
              <div className={c("down-sub")}>במקום לבטל לגמרי — שמור את הבוט פעיל בעלות נמוכה יותר.</div>
            </div>
          )}
          {(reason === "missing" || reason === "competitor" || reason === "other") && (
            <textarea
              className={c("fta")}
              placeholder="ספר לנו עוד — נשתמש בזה כדי להשתפר"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              maxLength={2000}
            />
          )}

          <button className={c("btn btn-primary")} onClick={acceptOffer} disabled={busy}>
            {busy ? "רגע…" : reason === "use" ? "עצור את החיוב" : reason === "price" || reason === "competitor" ? "עבור למסלול בסיסי" : reason === "hard" ? "קבל עזרה בהגדרה" : "שלח משוב"}
          </button>
          <button className={c("btn btn-ghost")} style={{ color: "var(--t4)", fontSize: 13, marginTop: 4 }} onClick={() => setScreen("s3")} disabled={busy}>בטל בכל זאת</button>
          <button className={c("btn btn-ghost")} onClick={() => router.push("/dashboard")}>חזור ל-Dashboard</button>
        </div>
      </div>

      {/* S3 — CONFIRM */}
      <div className={c("screen") + (screen === "s3" ? " " + styles.act : "")}>
        <div className={c("card")}>
          <button className={c("back-btn")} onClick={() => setScreen("s2")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            חזור
          </button>
          <div className={c("card-icon")} style={{ background: "var(--red-p)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
          </div>
          <div className={c("card-title")}>אישור ביטול</div>
          <div className={c("card-sub")}>ברגע שמבטלים — <strong>הבוט שלך מפסיק לענות ללקוחות</strong> בסוף תקופת החיוב הנוכחית.</div>
          <div style={{ background: "#fff8f8", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#991b1b", lineHeight: 1.8 }}>
              ❌ הבוט יפסיק לענות <strong>{stopText}</strong><br />
              ❌ כל ההגדרות שלך יישמרו 30 יום<br />
              ❌ לאחר מכן יימחקו לצמיתות
            </div>
          </div>
          <button className={c("btn btn-danger")} onClick={confirmCancel} disabled={busy}>{busy ? "מבטל…" : "כן, בטל את המנוי"}</button>
          <button className={c("btn btn-primary")} onClick={() => router.push("/dashboard")} disabled={busy}>השאר אותי — חזור ל-Dashboard</button>
        </div>
      </div>

      {/* S4 — CANCELLED */}
      <div className={c("screen") + (screen === "s4" ? " " + styles.act : "")}>
        <div className={c("card")} style={{ textAlign: "center" }}>
          <div className={c("success-icon")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className={c("card-title")}>{outcome?.title ?? "המנוי בוטל"}</div>
          <div className={c("card-sub")}>{outcome?.sub ?? <>המנוי שלך בוטל בהצלחה. הבוט ימשיך לפעול עד <strong>{untilText}</strong>.</>}<br /><br />תמיד תוכל לחזור — ההגדרות שלך שמורות.</div>
          <button className={c("btn btn-primary")} onClick={() => router.push("/")} style={{ marginTop: 8 }}>חזור לדף הבית</button>
          <button className={c("btn btn-ghost")} onClick={() => router.push("/dashboard")}>התחרטתי — הפעל מחדש</button>
        </div>
      </div>

      {/* S5 — OFFER ACCEPTED */}
      <div className={c("screen") + (screen === "s5" ? " " + styles.act : "")}>
        <div className={c("card")} style={{ textAlign: "center" }}>
          <div className={c("success-icon")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className={c("card-title")}>{outcome?.title ?? (reason ? ACCEPTED_TITLES[reason] : "תודה!")}</div>
          <div className={c("card-sub")}>{outcome?.sub ?? (reason ? ACCEPTED_SUBS[reason] : "")}</div>
          <button className={c("btn btn-primary")} onClick={() => router.push("/dashboard")} style={{ marginTop: 8 }}>חזור ל-Dashboard</button>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}

// useSearchParams() requires a Suspense boundary in the App Router.
export default function CancelPage() {
  return (
    <Suspense fallback={null}>
      <CancelInner />
    </Suspense>
  );
}
