"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./pricing.module.css";
import { scoped } from "@/lib/cx";
import PricingPlans from "@/components/PricingPlans";
import HeaderAuth from "@/components/site/HeaderAuth";
import { PRICING, PLAN_LIMITS } from "@/lib/plans";

const c = scoped(styles);

const fmt = (n: number) => n.toLocaleString("en-US");

const FAQS = [
  { q: "האם ניתן לשדרג או לשנמך בין מסלולים?", a: "כן — ניתן לשדרג בכל עת, השינוי נכנס לתוקף מיידית. שנמוך נכנס לתוקף בתחילת תקופת החיוב הבאה." },
  { q: "מה קורה כשנגמרות ההודעות?", a: "הבוט יפסיק לענות עד לחידוש המנוי בחודש הבא. לחלופין, ניתן לרכוש Pack הודעות נוסף מהאזור האישי — הוא לא פוקע ועובר מחודש לחודש." },
  { q: "האם הניסיון ב-7 ימים מחייב כרטיס אשראי?", a: "לא. ניתן להתחיל ולהשתמש ב-Robert ל-7 ימים מבלי להזין פרטי תשלום. ביום השמיני תתבקש לבחור מסלול." },
  { q: "כמה בוטים יכולים לפעול בו זמנית?", a: "כל הבוטים במסלול שלך פועלים בו זמנית. כל בוט מחובר למספר וואטסאפ נפרד ומנהל שיחות עצמאית." },
  { q: "האם ניתן לבטל בכל עת?", a: "כן — ביטול בלחיצה אחת מהאזור האישי. המנוי ממשיך עד סוף תקופת החיוב הנוכחית, ללא קנסות." },
];

function Check() {
  return <span className={c("check")}>✓</span>;
}
function CheckP() {
  return <span className={c("check-purple")}>✓</span>;
}
function Cross() {
  return <span className={c("cross")}>✕</span>;
}
function CrossD() {
  return <span className={c("cross-dark")}>✕</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // td helpers per column
  const td = (n: React.ReactNode) => <td>{n}</td>;
  const tdDark = (n: React.ReactNode) => <td className={c("td-dark")}>{n}</td>;
  const tdPurple = (n: React.ReactNode) => <td className={c("td-purple")}>{n}</td>;

  return (
    <div className={styles.pricing}>
      {/* NAV */}
      <nav className={c("nav")}>
        <div className={c("wrap nav-inner")}>
          <Link href="/" className={c("nav-logo")}>
            <div className={c("logo-name")}>Robert<em>.</em></div>
          </Link>
          <div className={c("nav-btns")}>
            <HeaderAuth
              as="div"
              loginLabel="כניסה"
              loginHref="/login"
              ctaLabel="הרשמה חינם"
              ctaHref="/onboarding"
              loginClass={c("btn-nav-login")}
              ctaClass={c("btn-nav-signup")}
            />
          </div>
        </div>
      </nav>

      <div className={c("wrap")}>
        {/* HERO */}
        <div className={c("hero")}>
          <div className={c("hero-badge")}>
            <div className={c("hero-badge-dot")}></div>
            7 ימי ניסיון חינם — ללא כרטיס אשראי
          </div>
          <h1>בחר את המסלול<br />הנכון לעסק שלך</h1>
          <p className={c("hero-sub")}>בוט WhatsApp חכם שמנהל לקוחות, תורים ולידים — 24/7, בלי מאמץ</p>

          <div className={c("toggle-wrap")}>
            <span className={c("tog-label") + (annual ? "" : " " + styles.act)}>חיוב חודשי</span>
            <label className={c("tog-switch")}>
              <input type="checkbox" checked={annual} onChange={(e) => setAnnual(e.target.checked)} />
              <div className={c("tog-track")}></div>
              <div className={c("tog-thumb")}></div>
            </label>
            <span className={c("tog-label") + (annual ? " " + styles.act : "")}>חיוב שנתי</span>
            <span className={c("save-chip")}>חיסכון 20%</span>
          </div>
        </div>

        {/* PLANS */}
        <PricingPlans annual={annual} />

        {/* COMPARISON TABLE */}
        <div className={c("compare-wrap")}>
          <div className={c("compare-title")}>השוואת מסלולים מלאה</div>
          <div style={{ overflowX: "auto" }}>
            <table className={c("table")}>
              <thead>
                <tr>
                  <th style={{ width: "38%" }}></th>
                  <th>בסיסי<br /><span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>₪{PRICING.basic.monthly}</span></th>
                  <th className={c("th-pop")}>מקצועי<br /><span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>₪{PRICING.pro.monthly}</span></th>
                  <th>Business<br /><span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>₪{PRICING.business.monthly}</span></th>
                  <th className={c("th-agency")}>Enterprise<br /><span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>₪{PRICING.enterprise.monthly}</span></th>
                </tr>
              </thead>
              <tbody>
                <tr><td className={c("row-label")} colSpan={5}>מגבלות</td></tr>
                <tr><td>מספר בוטים</td>{td(String(PLAN_LIMITS.basic.bots))}<td style={{ color: "var(--green)", fontWeight: 700 }}>{PLAN_LIMITS.pro.bots}</td><td className={c("td-dark")} style={{ color: "#fff", fontWeight: 700 }}>{PLAN_LIMITS.business.bots}</td><td className={c("td-purple")} style={{ color: "#c084fc", fontWeight: 700 }}>{PLAN_LIMITS.enterprise.bots}</td></tr>
                <tr><td>הודעות לחודש</td>{td(fmt(PLAN_LIMITS.basic.messages))}<td style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(PLAN_LIMITS.pro.messages)}</td><td className={c("td-dark")} style={{ color: "#fff", fontWeight: 700 }}>{fmt(PLAN_LIMITS.business.messages)}</td><td className={c("td-purple")} style={{ color: "#c084fc", fontWeight: 700 }}>{fmt(PLAN_LIMITS.enterprise.messages)}</td></tr>
                <tr><td>Packs הודעות נוספות</td>{td(<Check />)}{td(<Check />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>

                <tr><td className={c("row-label")} colSpan={5}>בוט AI</td></tr>
                <tr><td>שאלות ותשובות בסיסיות</td>{td(<Check />)}{td(<Check />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>שיחות AI חכמות</td>{td(<Cross />)}{td(<Check />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>זיכרון שיחה מתקדם</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>התאמה אישית AI</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>

                <tr><td className={c("row-label")} colSpan={5}>מערכת תורים</td></tr>
                <tr><td>קביעת תורים בסיסית</td>{td(<Check />)}{td(<Check />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>מערכת תורים מלאה</td>{td(<Cross />)}{td(<Check />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>סנכרון Google Calendar</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>תזמון מספר נציגים</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>

                <tr><td className={c("row-label")} colSpan={5}>לידים ואוטומציה</td></tr>
                <tr><td>לכידת לידים</td>{td(<Cross />)}{td(<Check />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>סינון לידים חכם</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<Check />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>API + Webhook</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<CrossD />)}{tdPurple(<CheckP />)}</tr>

                <tr><td className={c("row-label")} colSpan={5}>ניהול וסוכנות</td></tr>
                <tr><td>אנליטיקס</td>{td(<Cross />)}{td("בסיסי")}<td className={c("td-dark")} style={{ color: "#4ade80" }}>מלא</td><td className={c("td-purple")} style={{ color: "#c084fc" }}>מלא</td></tr>
                <tr><td>ניהול מרובה לקוחות</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<CrossD />)}{tdPurple(<CheckP />)}</tr>
                <tr><td>White-label</td>{td(<Cross />)}{td(<Cross />)}{tdDark(<CrossD />)}{tdPurple(<CheckP />)}</tr>

                <tr><td className={c("row-label")} colSpan={5}>תמיכה</td></tr>
                <tr><td>תמיכה</td>{td("מייל")}{td("מייל + צ'אט")}<td className={c("td-dark")} style={{ color: "#4ade80" }}>עדיפות</td><td className={c("td-purple")} style={{ color: "#c084fc" }}>24/7 ייעודי</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className={c("faq-wrap")}>
          <div className={c("faq-title")}>שאלות נפוצות</div>
          <div className={c("faq-list")}>
            {FAQS.map((f, i) => (
              <div key={i} className={c("faq-item") + (openFaq === i ? " " + styles.open : "")}>
                <div className={c("faq-q")} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span>
                  <svg className={c("arr")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div className={c("faq-a")}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA BAND */}
        <div className={c("cta-band")}>
          <h2>מוכן להפוך את הוואטסאפ שלך<br />למכונת מכירות?</h2>
          <p>הצטרף ל-+500 עסקים שכבר משתמשים ב-Robert</p>
          <div className={c("cta-band-btns")}>
            <Link href="/onboarding" className={c("btn-cta-white")}>התחל 7 ימים חינם</Link>
            <Link href="/" className={c("btn-cta-ghost")}>קרא עוד על Robert</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
