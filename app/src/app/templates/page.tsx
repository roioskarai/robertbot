"use client";

import { useState } from "react";
import styles from "./templates.module.css";
import { scoped } from "@/lib/cx";

const c = scoped(styles);

// {{x}} → variable chip · *x* → bold · \n → line break
function fmt(text: string): string {
  return text
    .replace(/\{\{([^}]+)\}\}/g, (_m, v) => `<span class="${styles.v}">{{${v}}}</span>`)
    .replace(/\*([^*]+)\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
}

type Row =
  | { t: "b"; dir: "in" | "out"; text: string; time: string }
  | { t: "qr"; items: string[] }
  | { t: "sp" };

interface Variant {
  name: string;
  badge: string;
  badgeClass: string;
  rows: Row[];
  note?: string;
}

interface Category {
  key: string;
  tab: string;
  secLabel: string;
  variants: Variant[];
}

const CATEGORIES: Category[] = [
  {
    key: "welcome",
    tab: "פתיחה",
    secLabel: "הודעת פתיחה — 3 גרסאות",
    variants: [
      {
        name: "חברותי ונעים", badge: "מומלץ", badgeClass: "b-friendly",
        rows: [
          { t: "b", dir: "out", text: "שלום רציתי לשאול", time: "10:22" },
          { t: "b", dir: "in", text: "היי! 👋 אני {{שם_בוט}}, הנציג של {{שם_עסק}}.\nשמחים שפנית! במה אוכל לעזור?", time: "10:22" },
          { t: "qr", items: ["📅 קביעת תור", "💰 מחירים", "🕐 שעות פעילות", "👤 נציג"] },
        ],
        note: "כפתורי בחירה מהירה — הלקוח לוחץ, לא כותב.",
      },
      {
        name: "מקצועי ורשמי", badge: "עסקים", badgeClass: "b-pro",
        rows: [
          { t: "b", dir: "out", text: "שלום", time: "14:05" },
          { t: "b", dir: "in", text: "שלום וברוכים הבאים ל{{שם_עסק}}.\nאשמח לסייע לכם.\n\nכיצד אוכל לעזור?", time: "14:05" },
          { t: "qr", items: ["קביעת פגישה", "שירותים ומחירים", "שעות פעילות", "דבר עם נציג"] },
        ],
        note: "ללא אימוג'ים. מתאים ליועצים, עורכי דין, רואי חשבון.",
      },
      {
        name: "קצר ולעניין", badge: "מהיר", badgeClass: "b-short",
        rows: [
          { t: "b", dir: "out", text: "היי", time: "09:10" },
          { t: "b", dir: "in", text: "{{שם_עסק}} — במה לעזור?", time: "09:10" },
          { t: "qr", items: ["תור", "מחיר", "שעות", "נציג"] },
        ],
        note: "מינימליסטי. מתאים למסעדות, מאפיות, עסקים עם תנועה גבוהה.",
      },
    ],
  },
  {
    key: "appointment",
    tab: "קביעת תור",
    secLabel: "3 גרסאות לשלב קביעת התור",
    variants: [
      {
        name: "חברותי — עם אימוג'ים", badge: "מומלץ", badgeClass: "b-friendly",
        rows: [
          { t: "b", dir: "in", text: "סופר! 🎉 בוא נקבע לך תור.\nאיזה שירות תרצה?", time: "10:05" },
          { t: "qr", items: ["✂️ תספורת ₪120", "💅 לק ג׳ל ₪80", "🧖 טיפול פנים ₪200"] },
          { t: "sp" },
          { t: "b", dir: "out", text: "תספורת ₪120", time: "10:05" },
          { t: "b", dir: "in", text: "מצוין! 💇\nאיזה תאריך נוח לך?", time: "10:05" },
          { t: "qr", items: ["ראשון 15.6", "שלישי 17.6", "חמישי 19.6", "ראשון 22.6", "תאריך אחר"] },
          { t: "sp" },
          { t: "b", dir: "out", text: "שלישי 17.6", time: "10:06" },
          { t: "b", dir: "in", text: "יופי! 🗓️ השעות הפנויות ב-17.6:", time: "10:06" },
          { t: "qr", items: ["09:00", "10:30", "13:00", "15:30", "17:00"] },
        ],
        note: "הלקוח לוחץ בלבד — אפס הקלדה. מתאים לסלוני יופי, מספרות, קוסמטיקה.",
      },
      {
        name: "מקצועי — ללא אימוג'ים", badge: "עסקים", badgeClass: "b-pro",
        rows: [
          { t: "b", dir: "in", text: "לקביעת פגישה — בחר שירות:", time: "11:00" },
          { t: "qr", items: ["ייעוץ ראשוני", "ייעוץ שוטף", "בדיקת מסמכים"] },
          { t: "sp" },
          { t: "b", dir: "out", text: "ייעוץ ראשוני", time: "11:01" },
          { t: "b", dir: "in", text: "בחר תאריך לפגישה:", time: "11:01" },
          { t: "qr", items: ["ראשון 15.6", "שני 16.6", "שלישי 17.6", "רביעי 18.6", "תאריך אחר"] },
        ],
        note: "ללא אימוג'ים. מתאים לרופאים, עורכי דין, יועצים.",
      },
      {
        name: "אישור תור — סיכום", badge: "שלב אחרון", badgeClass: "b-short",
        rows: [
          { t: "b", dir: "out", text: "17:00", time: "10:07" },
          { t: "b", dir: "in", text: "✅ אשר את הפרטים:\n\n📋 *תספורת*\n📅 שלישי 17.6\n🕐 17:00\n📍 {{כתובת}}\n💰 ₪120\n\nהכל נכון?", time: "10:07" },
          { t: "qr", items: ["✅ אשר תור", "✏️ שנה פרטים"] },
          { t: "sp" },
          { t: "b", dir: "out", text: "✅ אשר תור", time: "10:07" },
          { t: "b", dir: "in", text: '🎉 התור נקבע!\nישלח אליך תזכורת מחר.\nלביטול — שלח "בטל תור"', time: "10:07" },
        ],
        note: "סיכום לפני אישור + כפתור שינוי. מונע טעויות ומבטל צורך בתיקונים.",
      },
    ],
  },
  {
    key: "hours",
    tab: "שעות",
    secLabel: "מחוץ לשעות — 3 גרסאות",
    variants: [
      {
        name: "חברותי עם קביעת תור", badge: "מומלץ", badgeClass: "b-friendly",
        rows: [
          { t: "b", dir: "in", text: "היי! 🌙 אנחנו סגורים כרגע.\nשעות פעילות: {{שעות}}\n\nמה תרצה לעשות?", time: "23:10" },
          { t: "qr", items: ["📅 קבע תור למחר", "📩 השאר הודעה"] },
        ],
        note: "לא מסיים את השיחה — מציע פעולה. לקוח שמקבע תור בלילה = לקוח שנשמר.",
      },
      {
        name: "מקצועי — קצר", badge: "עסקים", badgeClass: "b-pro",
        rows: [
          { t: "b", dir: "in", text: "שלום.\nהעסק סגור כרגע — שעות פעילות: {{שעות}}\nנחזור אליך בפתיחה.", time: "21:05" },
          { t: "qr", items: ["קביעת פגישה", "השאר הודעה"] },
        ],
      },
      {
        name: "חג / סגירה מיוחדת", badge: "מיוחד", badgeClass: "b-short",
        rows: [
          { t: "b", dir: "in", text: "שלום! 🎉\nאנחנו סגורים היום — {{סיבה}}.\nחוזרים ב-{{תאריך_חזרה}}.\n\nאפשר לקבוע תור כבר עכשיו:", time: "09:00" },
          { t: "qr", items: ["📅 קבע תור"] },
        ],
        note: "גם בסגירה — הבוט עושה עבודה שיווקית ומכניס תורים.",
      },
    ],
  },
  {
    key: "handoff",
    tab: "מסירה",
    secLabel: "מסירה לנציג אנושי — 3 גרסאות",
    variants: [
      {
        name: "מסירה חלקה", badge: "מומלץ", badgeClass: "b-friendly",
        rows: [
          { t: "b", dir: "in", text: "שאלה מצוינת! 🙏\nבשביל זה אני מעביר אותך לנציג — הוא יענה לך בדיוק.\n\nזמן המתנה: {{זמן}}", time: "11:30" },
          { t: "qr", items: ["✅ המשך לנציג", "🔙 שאלה אחרת"] },
        ],
        note: "נותן ללקוח שליטה — יכול לחזור לבוט אם רוצה. מפחית טעינה על הנציג.",
      },
      {
        name: "מסירה מחוץ לשעות", badge: "לילה", badgeClass: "b-short",
        rows: [
          { t: "b", dir: "in", text: "קיבלתי! ✅\nהנציג יחזור אליך מחר בין {{שעות}}.\nההודעה שלך נשמרה — לא תצטרך לחזור עליה. 👌", time: "22:15" },
        ],
        note: "מבטיח ללקוח שהוא לא נשכח. מפחית חרדה ומונע הודעות כפולות.",
      },
      {
        name: "לקוח ביקש נציג בעצמו", badge: "ישיר", badgeClass: "b-pro",
        rows: [
          { t: "b", dir: "out", text: "אני רוצה לדבר עם בן אדם", time: "15:20" },
          { t: "b", dir: "in", text: "בטח! 👍\nמעביר אותך עכשיו.\nנחזור תוך {{זמן}}.", time: "15:20" },
        ],
        note: "קצר ויעיל — לא מתנגד ולא מנסה להשאיר בבוט. מכבד את בחירת הלקוח.",
      },
    ],
  },
  {
    key: "notunderstood",
    tab: "לא הבין",
    secLabel: "כשהבוט לא מבין — 3 גרסאות",
    variants: [
      {
        name: "חזרה לתפריט", badge: "מומלץ", badgeClass: "b-friendly",
        rows: [
          { t: "b", dir: "out", text: "מה עם ה...", time: "13:10" },
          { t: "b", dir: "in", text: "לא הצלחתי להבין 🙈\nבחר מהתפריט ואסדר לך:", time: "13:10" },
          { t: "qr", items: ["📅 תור", "💰 מחיר", "🕐 שעות", "👤 נציג"] },
        ],
        note: "לא משאיר את הלקוח תקוע — מחזיר לתפריט מיידית.",
      },
      {
        name: "ניסיון שני → נציג", badge: "אוטומטי", badgeClass: "b-short",
        rows: [
          { t: "b", dir: "in", text: "קצת קשה לי עם זה 😔\nאעביר אותך לנציג שיעזור לך בדיוק.", time: "13:12" },
          { t: "qr", items: ["✅ העבר לנציג", "🔙 נסה שוב"] },
        ],
        note: "מופעל אחרי 2 ניסיונות כושלים. לא מתוסכל — מסיר עצמו מהדרך בחן.",
      },
      {
        name: "מחוץ לתחום", badge: "ממוקד", badgeClass: "b-pro",
        rows: [
          { t: "b", dir: "out", text: "מה מחיר ביטקוין", time: "09:50" },
          { t: "b", dir: "in", text: "אני מתמחה ב{{שם_עסק}} בלבד 😊\nלגבי השירותים שלנו — אשמח לעזור!", time: "09:50" },
          { t: "qr", items: ["📅 קבע תור", "💰 מחירים"] },
        ],
        note: "לא מבזבז זמן — מחזיר להמרה מהר. עם חיוך.",
      },
    ],
  },
  {
    key: "followup",
    tab: "מעקב",
    secLabel: "מעקב אחרי ביקור — 3 גרסאות",
    variants: [
      {
        name: "בקשת חוות דעת — כפתורים", badge: "מומלץ", badgeClass: "b-friendly",
        rows: [
          { t: "b", dir: "in", text: "שלום! 😊 ביקרת אצלנו אתמול.\nאיך היה?", time: "10:00" },
          { t: "qr", items: ["⭐⭐⭐⭐⭐ מעולה", "⭐⭐⭐⭐ טוב", "⭐⭐⭐ בסדר", "👎 לא טוב"] },
        ],
        note: "לחיצה אחת — לא צריך לכתוב כלום. 4-5 כוכבים → מפנה לגוגל. 1-3 → מסירה מיידית לבעל העסק.",
      },
      {
        name: "חוות דעת חיובית → גוגל", badge: "המרה", badgeClass: "b-friendly",
        rows: [
          { t: "b", dir: "out", text: "⭐⭐⭐⭐⭐ מעולה", time: "10:01" },
          { t: "b", dir: "in", text: "תודה רבה! ❤️\nאם תרצה לשתף — ביקורת קצרה בגוגל עוזרת לנו מאוד 🙏", time: "10:01" },
          { t: "qr", items: ["⭐ כתוב ביקורת בגוגל", "📅 קבע תור הבא"] },
        ],
        note: "לקוח מרוצה = הזדמנות לביקורת + הזמנה לחזור. שני ערוצי המרה בהודעה אחת.",
      },
      {
        name: "לקוח לא חזר — הזמנה", badge: "Retention", badgeClass: "b-short",
        rows: [
          { t: "b", dir: "in", text: "שלום! 😊 מזמן לא ראינו אותך.\nרוצה לקבוע תור?", time: "10:00" },
          { t: "qr", items: ["📅 כן, קבע לי תור", "🔕 לא עכשיו"] },
        ],
        note: "נשלח אחרי X ימים ללא ביקור (בעל העסק מגדיר). \"לא עכשיו\" — מפסיק לחודש.",
      },
    ],
  },
];

function Mock({ rows }: { rows: Row[] }) {
  return (
    <div className={c("wa-mock")}>
      {rows.map((r, i) => {
        if (r.t === "sp") return <div key={i} style={{ marginTop: 8 }}></div>;
        if (r.t === "qr")
          return (
            <div key={i} className={c("qr-wrap")}>
              {r.items.map((b, j) => (
                <span key={j} className={c("qr-btn")}>{b}</span>
              ))}
            </div>
          );
        return (
          <div key={i} className={c("bubble-row") + (r.dir === "out" ? " " + styles.r : "")}>
            <div>
              <div className={c("bubble " + (r.dir === "out" ? "b-out" : "b-in"))} dangerouslySetInnerHTML={{ __html: fmt(r.text) }} />
              <div className={c("btime")}>{r.time}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TemplatesPage() {
  const [cat, setCat] = useState("welcome");
  const [sel, setSel] = useState<string | null>(null);
  const [welcomeMode, setWelcomeMode] = useState<"template" | "custom">("template");
  const active = CATEGORIES.find((x) => x.key === cat)!;

  return (
    <div className={styles.tmpl}>
      <div className={c("topnav")}>
        <h1>תבניות שיחה — Robert</h1>
        <p>3 גרסאות לכל קטגוריה · הבוט מוביל, הלקוח בוחר</p>
        <div style={{ background: "var(--green-50)", border: "1px solid var(--green-200)", borderRadius: 10, padding: "10px 14px", marginTop: 8, fontSize: 12.5, color: "var(--green-text)", lineHeight: 1.6 }}>
          💡 <strong>שם הבוט:</strong> במקום &quot;Robert&quot; יופיע השם שבחרת בהגדרות — <code style={{ background: "var(--green-p)", padding: "1px 5px", borderRadius: 4 }}>{"{{שם_בוט}}"}</code>. כל לקוח שלך בוחר שם אחר לבוט שלו.
        </div>
      </div>

      <div className={c("cat-tabs")}>
        {CATEGORIES.map((x) => (
          <button key={x.key} className={c("cat-tab") + (cat === x.key ? " " + styles.act : "")} onClick={() => { setCat(x.key); setSel(null); }}>
            {x.tab}
          </button>
        ))}
      </div>

      <div className={c("content")}>
        <div className={c("cat-pane") + " " + styles.act}>
          {/* welcome editing tools */}
          {cat === "welcome" && (
            <div>
              <div className={c("mode-toggle-wrap")}>
                <div>
                  <div className={c("mode-toggle-label")}>מצב עריכה</div>
                  <div className={c("mode-toggle-sub")}>בחר תבנית מוכנה או כתוב בעצמך</div>
                </div>
                <div className={c("mode-toggle")}>
                  <button className={c("mode-btn") + (welcomeMode === "template" ? " " + styles.act : "")} onClick={() => setWelcomeMode("template")}>תבניות מוכנות</button>
                  <button className={c("mode-btn") + (welcomeMode === "custom" ? " " + styles.act : "")} onClick={() => setWelcomeMode("custom")}>כתוב בעצמי</button>
                </div>
              </div>
              <div className={c("custom-area") + (welcomeMode === "custom" ? " " + styles.show : "")}>
                <label>📝 הודעת הבוט</label>
                <textarea className={c("custom-textarea")} placeholder="כתוב את ההודעה שהבוט ישלח...&#10;&#10;טיפ: השתמש ב {שם_לקוח} ו-{שם_עסק} בתוך הטקסט" />
                <div className={c("custom-hint")}>💡 משתנים זמינים: {"{שם_לקוח}"} · {"{שם_עסק}"} · {"{שעות}"} · {"{תאריך}"}</div>
                <span className={c("custom-btns-label")}>⚡ כפתורי בחירה מהירה (אופציונלי)</span>
                <div className={c("custom-btn-row")}>
                  <input className={c("custom-btn-input")} placeholder="טקסט כפתור 1..." />
                </div>
                <div className={c("custom-btn-row")}>
                  <input className={c("custom-btn-input")} placeholder="טקסט כפתור 2..." />
                </div>
                <button className={c("add-btn-link")}>+ הוסף כפתור</button>
              </div>
            </div>
          )}

          {/* appointment flow */}
          {cat === "appointment" && (
            <div>
              <div className={c("sec-label")}>זרימת קביעת תור — איך זה עובד</div>
              <div style={{ background: "var(--white)", border: "1px solid var(--bdr)", borderRadius: 14, padding: "14px 16px", boxShadow: "var(--shadow)", marginBottom: 4 }}>
                <div className={c("flow")}>
                  {[
                    ["1. לקוח מבקש תור", 'כותב "תור" / "אני רוצה לקבוע" / לוחץ כפתור'],
                    ["2. בחירת שירות", "הבוט מציג את רשימת השירותים של העסק ככפתורים"],
                    ["3. בחירת תאריך", "הבוט סורק תורים פנויים ומציע 5 תאריכים קרובים"],
                    ["4. בחירת שעה", "אחרי בחירת תאריך — נפתחות השעות הפנויות באותו יום"],
                    ["5. אישור ✅", "הבוט מציג סיכום ומבקש אישור אחרון"],
                    ["6. תזכורת אוטומטית", "יום לפני — הבוט שולח תזכורת עם אפשרות ביטול"],
                  ].map(([title, sub], i, arr) => (
                    <div className={c("flow-step")} key={i}>
                      <div className={c("flow-line")}>
                        <div className={c("flow-dot")}></div>
                        {i < arr.length - 1 && <div className={c("flow-vline")}></div>}
                      </div>
                      <div className={c("flow-text")}><strong>{title}</strong><br />{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "var(--t4)", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--bdr)" }}>
                  ⚙️ <strong>בעל העסק מגדיר:</strong> מרווחי תור (15/30/45/60 דקות) · ימי עבודה · שעות · חופשות
                </div>
              </div>
            </div>
          )}

          <div>
            <div className={c("sec-label")}>{active.secLabel}</div>
            <div className={c("variants")}>
              {active.variants.map((v, i) => {
                const id = active.key + i;
                return (
                  <div key={id} className={c("variant-card") + (sel === id ? " " + styles.sel : "")} onClick={() => setSel(id)}>
                    <div className={c("vc-head")}>
                      <span className={c("vc-name")}>{v.name}</span>
                      <span className={c("vc-badge " + v.badgeClass)}>{v.badge}</span>
                    </div>
                    <div className={c("vc-body")}>
                      <Mock rows={v.rows} />
                      {v.note && <div className={c("vc-note")}>{v.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
