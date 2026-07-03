"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./cancel.module.css";
import { scoped } from "@/lib/cx";

const c = scoped(styles);

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
  use: "לא משתמש? הקפא את המנוי",
  hard: "קשה להגדיר? יש סרטון הסבר קצר",
  missing: "חסר פיצ'ר? ספר לנו",
  competitor: "עברת למתחרה?",
  other: "נצטער לשמוע",
};
const ACCEPTED_TITLES: Record<Reason, string> = {
  price: "עברת למסלול בסיסי!",
  use: "המנוי הוקפא!",
  hard: "תודה — צפה בסרטון וחזור אלינו!",
  missing: "המשוב נשלח — תודה!",
  competitor: "עברת למסלול בסיסי",
  other: "המשוב נשלח — תודה!",
};
const ACCEPTED_SUBS: Record<Reason, string> = {
  price: "המסלול שלך שונה ל-₪99/חודש. הבוט ממשיך לעבוד.",
  use: "הבוט מושהה. כשתחזור — הכל ממש כמו שהשארת.",
  hard: "אנחנו כאן אם תצטרך עזרה נוספת.",
  missing: "נעדכן אותך כשהפיצ'ר יהיה מוכן.",
  competitor: "המסלול שלך שונה. הבוט ממשיך לעבוד.",
  other: "אנחנו תמיד שמחים לשמוע.",
};

export default function CancelPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenId>("s1");
  const [reason, setReason] = useState<Reason | null>(null);

  function next() {
    if (!reason) {
      alert("בחר סיבה");
      return;
    }
    setScreen("s2");
  }

  async function acceptOffer() {
    if (!reason) return;
    // Wire the retention offers to the billing API.
    if (reason === "use") await fetch("/api/billing/pause", { method: "POST" }).catch(() => {});
    if (reason === "price" || reason === "competitor")
      await fetch("/api/billing/downgrade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "basic" }) }).catch(() => {});
    setScreen("s5");
  }

  async function confirmCancel() {
    await fetch("/api/billing/cancel", { method: "POST" }).catch(() => {});
    setScreen("s4");
  }

  const Nav = (
    <nav className={c("nav")}>
      <Link href="/" className={c("nav-logo")}>
        <div className={c("nlm")}><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8l4 4-4 4" /></svg></div>
        <div className={c("nln")}>Robert<em>.</em></div>
      </Link>
      <Link href="/dashboard" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>חזור ל-Dashboard</Link>
    </nav>
  );

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
          <div className={c("stats-row")}>
            <div className={c("stat-box")}><div className={c("stat-n green")}>847</div><div className={c("stat-l")}>הודעות החודש</div></div>
            <div className={c("stat-box")}><div className={c("stat-n green")}>124</div><div className={c("stat-l")}>שיחות שנסגרו</div></div>
            <div className={c("stat-box")}><div className={c("stat-n green")}>3שנ&apos;</div><div className={c("stat-l")}>זמן תגובה</div></div>
          </div>
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
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </div>
          <div className={c("card-title")}>{reason ? OFFER_TITLES[reason] : ""}</div>
          <div className={c("card-sub")}>ספציפית בשבילך, הכנו הצעה שלא תרצה לפספס.</div>

          {reason === "price" && (
            <>
              <div className={c("offer-card")} style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}><span style={{ fontSize: 13, color: "#334155" }}>נציג שירות לקוחות</span><span style={{ fontSize: 15, fontWeight: 800, color: "#dc2626" }}>₪5,000+/חודש</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}><span style={{ fontSize: 13, color: "#334155" }}>Robert — מסלול מתקדם</span><span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>₪199/חודש</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}><span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>החיסכון שלך</span><span style={{ fontSize: 18, fontWeight: 900, color: "#16a34a" }}>₪4,801/חודש</span></div>
                </div>
              </div>
              <div className={c("down-card")} style={{ marginTop: 10 }}>
                <div className={c("down-title")}>⬇️ אפשרות: ירידה למסלול בסיסי</div>
                <div className={c("down-sub")}>₪99/חודש — בוט אחד, 500 הודעות. הבוט ממשיך לענות ללקוחות.</div>
              </div>
            </>
          )}
          {reason === "use" && (
            <div className={c("pause-card")}>
              <div className={c("pause-title")}>⏸️ הקפאת מנוי — עד 3 חודשים</div>
              <div className={c("pause-sub")}>הבוט מושהה, ההגדרות נשמרות, אין חיוב. כשתחזור — הכל ממש כמו שהשארת.</div>
            </div>
          )}
          {reason === "hard" && (
            <div className={c("offer-card")}>
              <div className={c("offer-badge")}>סרטון הדרכה — 5 דקות</div>
              <div style={{ background: "#0f172a", borderRadius: 10, height: 120, display: "flex", alignItems: "center", justifyContent: "center", margin: "12px 0" }}>
                <div style={{ width: 46, height: 46, background: "rgba(255,255,255,.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,.2)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
              </div>
              <div className={c("offer-sub")}>הגדרה מלאה — שם עסק, שירותים, שאלות נפוצות וחיבור וואטסאפ.</div>
            </div>
          )}
          {reason === "competitor" && (
            <div className={c("down-card")}>
              <div className={c("down-title")}>⬇️ עבור למסלול בסיסי — ₪99</div>
              <div className={c("down-sub")}>במקום לבטל לגמרי — שמור את הבוט פעיל בעלות נמוכה יותר.</div>
            </div>
          )}
          {(reason === "missing" || reason === "competitor" || reason === "other") && (
            <textarea className={c("fta")} placeholder="ספר לנו עוד — נשתמש בזה כדי להשתפר" />
          )}

          <button className={c("btn btn-primary")} onClick={acceptOffer}>
            {reason === "use" ? "הקפא את המנוי" : reason === "price" || reason === "competitor" ? "עבור למסלול בסיסי" : reason === "hard" ? "צפה בסרטון וחזור" : "שלח משוב"}
          </button>
          <button className={c("btn btn-ghost")} style={{ color: "var(--t4)", fontSize: 13, marginTop: 4 }} onClick={() => setScreen("s3")}>בטל בכל זאת</button>
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
              ❌ הבוט יפסיק לענות ב-<strong>1.7.2026</strong><br />
              ❌ כל ההגדרות שלך יישמרו 30 יום<br />
              ❌ לאחר מכן יימחקו לצמיתות
            </div>
          </div>
          <button className={c("btn btn-danger")} onClick={confirmCancel}>כן, בטל את המנוי</button>
          <button className={c("btn btn-primary")} onClick={() => router.push("/dashboard")}>השאר אותי — חזור ל-Dashboard</button>
        </div>
      </div>

      {/* S4 — CANCELLED */}
      <div className={c("screen") + (screen === "s4" ? " " + styles.act : "")}>
        <div className={c("card")} style={{ textAlign: "center" }}>
          <div className={c("success-icon")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className={c("card-title")}>המנוי בוטל</div>
          <div className={c("card-sub")}>המנוי שלך בוטל בהצלחה. הבוט ימשיך לפעול עד <strong>1.7.2026</strong>.<br /><br />תמיד תוכל לחזור — ההגדרות שלך שמורות.</div>
          <button className={c("btn btn-primary")} onClick={() => router.push("/")} style={{ marginTop: 8 }}>חזור לדף הבית</button>
          <button className={c("btn btn-ghost")} onClick={() => router.push("/dashboard")}>התחרטתי — הפעל מחדש</button>
        </div>
      </div>

      {/* S5 — OFFER ACCEPTED */}
      <div className={c("screen") + (screen === "s5" ? " " + styles.act : "")}>
        <div className={c("card")} style={{ textAlign: "center" }}>
          <div className={c("success-icon")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className={c("card-title")}>{reason ? ACCEPTED_TITLES[reason] : "תודה!"}</div>
          <div className={c("card-sub")}>{reason ? ACCEPTED_SUBS[reason] : ""}</div>
          <button className={c("btn btn-primary")} onClick={() => router.push("/dashboard")} style={{ marginTop: 8 }}>חזור ל-Dashboard</button>
        </div>
      </div>
    </div>
  );
}
