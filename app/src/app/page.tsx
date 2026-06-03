"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./landing.module.css";
import { scoped } from "@/lib/cx";
import PricingPlans from "@/components/PricingPlans";

const c = scoped(styles);

const FAQS = [
  {
    q: "האם אני צריך ידע טכני?",
    a: "בכלל לא. אם אתה יודע למלא טופס — אתה יכול להקים את Robert. אין קוד, אין הגדרות מסובכות. תוך 5 דקות הבוט חי ועובד.",
  },
  {
    q: "האם אפשר לחבר את המספר העסקי הקיים?",
    a: "כן. אפשר לחבר כל מספר וואטסאפ Business קיים. המערכת מדריכה אותך שלב אחר שלב — לוקח כ-5 דקות בלבד.",
  },
  {
    q: "מה קורה אם הבוט לא יודע לענות?",
    a: "Robert מעביר את השיחה אליך עם כל ההיסטוריה. אתה רואה הכל ועונה ישירות מהממשק. שום לקוח לא נאבד.",
  },
  {
    q: "האם אפשר לשנות את הבוט אחרי שהוא עולה?",
    a: "בוודאי. שינוי מחיר, הוספת שירות, עדכון שעות פעילות — כל שינוי נכנס לתוקף מיידית, בלי עלות נוספת.",
  },
  {
    q: "מה קורה בסוף 7 ימי הניסיון?",
    a: "אם אהבת — עובר למסלול שבחרת. אם לא — הבוט מתנתק ואין שום חיוב. ללא התחייבות, ללא קנסות, ללא שיחות מכירה.",
  },
];

export default function LandingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // reveal-on-scroll
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("." + styles.rv);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting)
            setTimeout(() => e.target.classList.add(styles.on), i * 55);
        });
      },
      { threshold: 0.06 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    rootRef.current
      ?.querySelector(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={rootRef} className={`${styles.landing} ${annual ? styles.annual : ""}`}>
      {/* NAV */}
      <nav className={c("nav")}>
        <div className={c("logo")}>
          Robert<em>.</em>
        </div>
        <ul className={c("nav-links")}>
          <li>
            <a href="#how" onClick={scrollTo("#how")}>
              איך זה עובד
            </a>
          </li>
          <li>
            <a href="#features" onClick={scrollTo("#features")}>
              יתרונות
            </a>
          </li>
          <li>
            <Link href="/pricing">מחירים</Link>
          </li>
          <li>
            <a href="#faq" onClick={scrollTo("#faq")}>
              שאלות
            </a>
          </li>
          <li>
            <Link href="/dashboard" className={c("nav-login")}>
              כניסה
            </Link>
          </li>
          <li>
            <Link href="/onboarding" className={c("nav-cta")}>
              הרשמה חינם
            </Link>
          </li>
        </ul>
      </nav>

      {/* HERO */}
      <div style={{ background: "var(--white)", borderBottom: "1px solid var(--bdr)" }}>
        <section className={c("hero")}>
          <div className={c("hero-text rv")}>
            <div className={c("hero-eyebrow")}>
              <span></span>7 ימי ניסיון חינם — ללא כרטיס אשראי
            </div>
            <h1>
              הבוט שעונה
              <br />
              ללקוחות שלך
              <br />
              <strong>בוואטסאפ</strong>
            </h1>
            <p className={c("hero-sub")}>
              Robert עונה, מסביר, קובע פגישות — בשמך, 24/7.
              <br />
              אתה מגדיר פעם אחת ומקבל לקוחות מרוצים.
            </p>
            <div className={c("hero-btns")}>
              <Link href="/onboarding" className={c("btn-primary")}>
                צור את הבוט שלך — חינם
              </Link>
              <a href="#how" onClick={scrollTo("#how")} className={c("btn-ghost")}>
                איך זה עובד?
              </a>
            </div>
            <div className={c("hero-trust")}>
              <div className={c("trust-avatars")}>
                <span className={c("av1")}>מ</span>
                <span className={c("av2")}>ד</span>
                <span className={c("av3")}>ר</span>
                <span className={c("av4")}>ש</span>
              </div>
              <span>
                כבר <strong>+500 עסקים</strong> השתמשו בתקופת הבטא
              </span>
            </div>
          </div>
          <div className={c("phone-wrap rv")}>
            <div className={c("phone")}>
              <div className={c("ph-hdr")}>
                <div className={c("ph-av")}>R</div>
                <div>
                  <div className={c("ph-name")}>Robert — נציג העסק</div>
                  <div className={c("ph-st")}>🟢 מחובר · עונה תוך שניות</div>
                </div>
              </div>
              <div className={c("ph-body")}>
                <div className={c("msg mi")}>
                  שלום! מה המחיר שלכם? 😊<div className={c("mt")}>09:14</div>
                </div>
                <div className={c("msg mo")}>
                  היי! תודה שפנית 🙌 המחיר מתחיל מ-₪99/חודש, עם 7 ימי ניסיון חינם.
                  <div className={c("mt")}>09:14</div>
                </div>
                <div className={c("msg mi")}>
                  מעולה! ואיך קובעים פגישה?<div className={c("mt")}>09:15</div>
                </div>
                <div className={c("msg mo")}>
                  📅 לחץ כאן לקביעת פגישה — יש זמינות כבר מחר!
                  <div className={c("mt")}>09:15</div>
                </div>
                <div className={c("msg mi")}>
                  תודה רבה! 🙏<div className={c("mt")}>09:15</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* STATS STRIP */}
      <div className={c("stats-strip")}>
        <div className={c("stats-inner")}>
          <div className={c("stat rv")}>
            <span className={c("stat-n")}>5 דק&apos;</span>
            <span className={c("stat-l")}>הקמת בוט מלא</span>
          </div>
          <div className={c("stat rv")}>
            <span className={c("stat-n")}>24/7</span>
            <span className={c("stat-l")}>זמינות מלאה</span>
          </div>
          <div className={c("stat rv")}>
            <span className={c("stat-n")}>+500</span>
            <span className={c("stat-l")}>עסקים פעילים</span>
          </div>
          <div className={c("stat rv")}>
            <span className={c("stat-n")}>98%</span>
            <span className={c("stat-l")}>שביעות רצון</span>
          </div>
          <div className={c("stat rv")}>
            <span className={c("stat-n")}>3 שנ&apos;</span>
            <span className={c("stat-l")}>זמן תגובה</span>
          </div>
          <div className={c("stat rv")}>
            <span className={c("stat-n")}>∞</span>
            <span className={c("stat-l")}>שיחות במקביל</span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className={c("sec")} id="how">
        <div className={c("sh rv")}>
          <div className={c("tag tg")}>איך זה עובד</div>
          <h2 className={c("sec-title")}>מוכן תוך 3 צעדים פשוטים</h2>
          <p className={c("sec-sub")}>
            בלי קוד, בלי טכנאים, בלי כאב ראש. הכל דרך האזור האישי שלך.
          </p>
        </div>
        <div className={c("steps-wrap")}>
          <div className={c("steps")}>
            <div className={c("step rv")}>
              <div className={c("step-num sn1")}>01</div>
              <span className={c("step-icon")}>📝</span>
              <h3>מגדיר את העסק שלך</h3>
              <p>
                שם, תחום, שאלות נפוצות, מחירים, סגנון דיבור. אתה בוחר בדיוק איך
                Robert מדבר עם הלקוחות שלך.
              </p>
            </div>
            <div className={c("step rv")}>
              <div className={c("step-num sn2")}>02</div>
              <span className={c("step-icon")}>⚡</span>
              <h3>Robert נוצר תוך דקות</h3>
              <p>
                המערכת בונה לך בוט מותאם אישית לעסק. שינית דעתך? עדכון בלחיצה —
                נכנס לתוקף מיידית.
              </p>
            </div>
            <div className={c("step rv")}>
              <div className={c("step-num sn3")}>03</div>
              <span className={c("step-icon")}>🚀</span>
              <h3>מחבר לוואטסאפ ויוצא לדרך</h3>
              <p>
                מחבר את המספר העסקי בתהליך פשוט של 5 דקות. Robert מתחיל לענות —
                אתה נח ומכניס.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <div className={c("sec-full")}>
        <div className={c("sec-full-inner")} id="features">
          <div className={c("sh rv")}>
            <div className={c("tag tp")}>למה Robert</div>
            <h2 className={c("sec-title")}>
              הכל במקום אחד —<br />
              בלי להתפשר
            </h2>
            <p className={c("sec-sub")}>
              כל מה שנציג אנושי עושה, Robert עושה טוב יותר. וזול יותר.
            </p>
          </div>
          <div className={c("feats-grid")}>
            {([
              ["ic-g", "⏰", "זמין 24/7 — גם בשבת בלילה", "לקוחות שואלים בכל שעה. Robert תמיד שם, עונה תוך שניות, לא מתעייף ולא חולה ולא מבקש העלאה."],
              ["ic-p", "🎨", "גמישות מלאה — אתה שולט", "רוצה לשנות סגנון? לעדכן מחיר? להוסיף שירות חדש? שינוי בלחיצה אחת, בלי לשלם לאף אחד."],
              ["ic-o", "💸", "חוסך אלפי שקלים בחודש", "נציג שירות עולה ₪6,000+ בחודש. Robert עושה אותה עבודה בשבריר מהמחיר — כל חודש, כל שנה."],
              ["ic-g", "🔄", "מפסיק מתי שרוצה", "אין חוזים ואין קנסות. ביטול בלחיצה אחת. אתה תמיד בשליטה מלאה על המנוי שלך."],
              ["ic-p", "🧠", "לומד את העסק שלך", "Robert מכיר את המוצרים, השירותים, השעות והמחירים — ועונה בדיוק כמו שאתה היית עונה."],
              ["ic-r", "👤", "מסירה לאדם בלחיצה", "שאלה מסובכת? Robert מעביר את השיחה אליך עם כל ההיסטוריה. שום לקוח לא נאבד בדרך."],
            ] as const).map(([ic, emoji, title, desc], i) => (
              <div className={c("feat rv")} key={i}>
                <div className={c("feat-ic " + ic)}>{emoji}</div>
                <div className={c("feat-body")}>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <section className={c("sec")} id="pricing">
        <div className={c("sh rv")}>
          <div className={c("tag tg")}>מחירים</div>
          <h2 className={c("sec-title")}>
            מחיר פשוט, שקוף,<br />
            ללא הפתעות
          </h2>
          <p className={c("sec-sub")}>
            מתחילים בחינם. משדרגים כשרוצים. מבטלים מתי שרוצים.
          </p>
        </div>

        <div className={c("billing-toggle-wrap rv")}>
          <span className={c("billing-label" + (annual ? "" : " act"))}>חיוב חודשי</span>
          <label className={c("ios-toggle")}>
            <input
              type="checkbox"
              checked={annual}
              onChange={(e) => setAnnual(e.target.checked)}
            />
            <div className={c("ios-track")}></div>
            <div className={c("ios-thumb")}></div>
          </label>
          <span className={c("billing-label" + (annual ? " act" : ""))}>
            חיוב שנתי
            <span className={c("save-badge")}>חיסכון 20%</span>
          </span>
        </div>

        <PricingPlans annual={annual} />
        <div className={c("rv")} style={{ textAlign: "center", marginTop: 14 }}>
          <Link href="/pricing" style={{ color: "var(--green-d)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            השוואת מסלולים מלאה ←
          </Link>
        </div>

        <div className={c("rv")} style={{ marginTop: 18, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--bg)",
              border: "1px solid var(--bdr)",
              borderRadius: 100,
              padding: "8px 18px",
              fontSize: 13,
              color: "var(--t3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            מנויים פעילים יכולים לרכוש הודעות נוספות מתוך האזור האישי
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <div className={c("sec-full")}>
        <div className={c("sec-full-inner")}>
          <div className={c("sh rv")}>
            <div className={c("tag to")}>לקוחות מספרים</div>
            <h2 className={c("sec-title")}>הם כבר עובדים עם Robert</h2>
          </div>
          <div className={c("testimonials")}>
            <div className={c("testi rv")}>
              <div className={c("testi-stars")}>★★★★★</div>
              <p className={c("testi-text")}>״הקמתי את הבוט תוך 10 דקות. עכשיו הוא עונה ללקוחות בזמן שאני ישן. פשוט מדהים.״</p>
              <div className={c("testi-author")}>
                <div className={c("testi-av")} style={{ background: "#dbeafe", color: "#1e40af" }}>מ</div>
                <div>
                  <div className={c("testi-name")}>מיכאל כהן</div>
                  <div className={c("testi-role")}>בעל מוסך, תל אביב</div>
                </div>
              </div>
            </div>
            <div className={c("testi rv")}>
              <div className={c("testi-stars")}>★★★★★</div>
              <p className={c("testi-text")}>״חסכתי ₪4,000 בחודש על מזכירה. הבוט עונה טוב יותר ממנה ולא לוקח הפסקות.״</p>
              <div className={c("testi-author")}>
                <div className={c("testi-av")} style={{ background: "#dcfce7", color: "#166534" }}>ד</div>
                <div>
                  <div className={c("testi-name")}>דנה לוי</div>
                  <div className={c("testi-role")}>קוסמטיקאית, חיפה</div>
                </div>
              </div>
            </div>
            <div className={c("testi rv")}>
              <div className={c("testi-stars")}>★★★★★</div>
              <p className={c("testi-text")}>״לקוחות כותבים לי בלילה ומקבלים תשובה מיידית. הסגרתי 3 עסקאות שפספסתי לפני.״</p>
              <div className={c("testi-author")}>
                <div className={c("testi-av")} style={{ background: "#fef9c3", color: "#854d0e" }}>ר</div>
                <div>
                  <div className={c("testi-name")}>רון אברהם</div>
                  <div className={c("testi-role")}>יועץ עסקי, ירושלים</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className={c("sec")} id="faq">
        <div className={c("sh rv")}>
          <div className={c("tag tp")}>שאלות נפוצות</div>
          <h2 className={c("sec-title")}>יש לך שאלות?</h2>
        </div>
        <div className={c("faqs")}>
          {FAQS.map((f, i) => (
            <div
              className={c("faq rv") + (openFaq === i ? " " + styles.open : "")}
              key={i}
            >
              <div
                className={c("fq")}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {f.q}
                <span className={c("farr")}>▼</span>
              </div>
              <div className={c("fa")}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className={c("cta-band")}>
        <h2>מוכן שRobert יעבוד בשבילך?</h2>
        <p>7 ימים חינם. ללא כרטיס אשראי. מבטל מתי שרוצה.</p>
        <Link href="/onboarding" className={c("btn-primary")} style={{ display: "inline-flex" }}>
          צור את הבוט שלך עכשיו — חינם 🚀
        </Link>
      </div>

      {/* FOOTER */}
      <footer className={c("footer")}>
        <div className={c("footer-logo")}>
          Robert<em>.</em>
        </div>
        <div className={c("footer-copy")}>© 2026 Robert. כל הזכויות שמורות.</div>
        <div className={c("footer-links")}>
          <Link href="/legal">תנאי שימוש</Link>
          <Link href="/legal">פרטיות</Link>
          <a href="mailto:support@robertbot.co.il">צור קשר</a>
        </div>
      </footer>
    </div>
  );
}
