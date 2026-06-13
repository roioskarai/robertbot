"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./onboarding.module.css";
import { scoped } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import {
  MAIN_CATEGORIES,
  SUB_CATS,
  DAYS_HE,
  DAY_KEYS,
} from "./subcats";
import type { BotStyle, Service, FaqItem, WorkingHours } from "@/lib/types";

const c = scoped(styles);

const LogoMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8l4 4-4 4" />
  </svg>
);

const STYLE_OPTIONS: { badge: string; badgeClass: string; name: string; ex: string; value: BotStyle }[] = [
  { badge: "מומלץ", badgeClass: "sb-g", name: "חברותי ונעים", ex: '"היי! תודה שפנית 😊 שמחים לעזור לך..."', value: "friendly" },
  { badge: "מקצועי", badgeClass: "sb-b", name: "רשמי ומקצועי", ex: '"שלום, תודה על פנייתך. נשמח לסייע..."', value: "professional" },
  { badge: "יעיל", badgeClass: "sb-y", name: "קצר ולעניין", ex: '"שלום! מחיר תספורת: ₪120. לתור — שלח תאריך."', value: "short" },
  { badge: "אישי", badgeClass: "sb-p", name: "חם ואישי", ex: '"אהלן! איזה כיף שפנית, אשמח לעזור לך..."', value: "friendly" },
];

const DEFAULT_HOURS_OPEN = ["09:00", "09:00", "09:00", "09:00", "09:00", "09:00", null];
const DEFAULT_HOURS_CLOSE = ["19:00", "19:00", "19:00", "19:00", "19:00", "14:00", null];

interface DayRow {
  open: string;
  close: string;
  closed: boolean;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const searchParams = useSearchParams();
  // Logged-in users coming from the dashboard ("בוט חדש") skip signup
  // and land straight on the bot-creation wizard.
  const startOnWizard = searchParams.get("new") === "1";

  const [screen, setScreen] = useState<"signup" | "ob" | "success">(
    startOnWizard ? "ob" : "signup",
  );
  const [curStep, setCurStep] = useState(1);

  // signup
  const [su, setSu] = useState({ full_name: "", email: "", password: "" });

  // step 1 — category
  const [catView, setCatView] = useState<"main" | "sub">("main");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [bizType, setBizType] = useState<string | null>(null);
  const [bizSubtype, setBizSubtype] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");

  // step 2 — details + hours
  const [details, setDetails] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    link: "",
  });
  const [hours, setHours] = useState<DayRow[]>(
    DAYS_HE.map((_, i) => ({
      open: DEFAULT_HOURS_OPEN[i] ?? "09:00",
      close: DEFAULT_HOURS_CLOSE[i] ?? "18:00",
      closed: DEFAULT_HOURS_OPEN[i] === null,
    })),
  );

  // step 3 — services + faq
  const [services, setServices] = useState<Service[]>([
    { name: "תספורת נשים", price: "₪120" },
    { name: "תספורת בנות", price: "₪80" },
    { name: "צביעה שלמה", price: "₪250" },
  ]);
  const [faqs, setFaqs] = useState<FaqItem[]>([
    { question: "מה שעות הפעילות?", answer: "א'-ו' 9:00-19:00, שבת סגור" },
    { question: "איך קובעים תור?", answer: "דרך הוואטסאפ הזה או בטלפון שלנו" },
  ]);

  // step 4 — style
  const [styleIdx, setStyleIdx] = useState(0);

  // step 5 — whatsapp
  const [waNumber, setWaNumber] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // success
  const [successInfo, setSuccessInfo] = useState({ botName: "", wa: "" });

  const totalSteps = 5;

  // ── signup
  async function doSignup() {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(su),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || "ההרשמה נכשלה — ממשיכים במצב הדגמה");
      }
    } catch {
      toast("אין חיבור לשרת — ממשיכים במצב הדגמה");
    }
    // Advance to the wizard regardless (matches the original UX).
    setScreen("ob");
  }

  async function googleSignup() {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
    } catch {
      setScreen("ob");
    }
  }

  // ── step 1
  function openSub(catKey: string) {
    setActiveCat(catKey);
    setBizType(catKey);
    setCatView("sub");
    setCustomOpen(false);
    setCustomVal("");
  }
  function selSub(name: string) {
    setBizSubtype(name);
    setTimeout(() => nextStep(), 350);
  }
  function confirmCustom() {
    if (!customVal.trim()) {
      toast("נא להכניס שם");
      return;
    }
    setBizSubtype(customVal.trim());
    setTimeout(() => nextStep(), 200);
  }

  // ── navigation
  function nextStep() {
    setCurStep((s) => {
      if (s === totalSteps) {
        finish();
        return s;
      }
      return Math.min(totalSteps, s + 1);
    });
  }
  function prevStep() {
    setCurStep((s) => Math.max(1, s - 1));
  }
  function jumpStep(n: number) {
    setCurStep((s) => (n <= s ? n : s));
  }

  function sendCode() {
    if (!waNumber) {
      toast("נא להכניס מספר");
      return;
    }
    setCodeSent(true);
    toast("קוד אימות נשלח ל-" + waNumber);
  }

  function buildWorkingHours(): WorkingHours {
    const wh = {} as WorkingHours;
    DAY_KEYS.forEach((k, i) => {
      wh[k] = { open: hours[i].open, close: hours[i].close, closed: hours[i].closed };
    });
    return wh;
  }

  async function finish() {
    const botName = details.name || "הבוט שלי";
    setSuccessInfo({ botName, wa: waNumber || "---" });

    const payload = {
      name: details.name || botName,
      bot_name: botName,
      business_type: bizType,
      business_subtype: bizSubtype,
      description: details.description,
      address: details.address,
      phone: details.phone,
      services,
      faq: faqs,
      working_hours: buildWorkingHours(),
      style: STYLE_OPTIONS[styleIdx].value,
    };

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { bot } = await res.json();
        if (waNumber && bot?.id) {
          await fetch(`/api/bots/${bot.id}/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number: waNumber, code: "000000" }),
          }).catch(() => {});
          await fetch(`/api/bots/${bot.id}/activate`, { method: "POST" }).catch(() => {});
        }
      }
    } catch {
      /* demo mode — still show success */
    }
    setScreen("success");
  }

  // ── render
  return (
    <div className={styles.ob}>
      <ToastHost />

      {/* SCREEN 1: SIGNUP */}
      <div className={c("screen") + (screen === "signup" ? " " + styles.act : "")}>
        <div className={c("signup-wrap")}>
          <div className={c("signup-card")}>
            <div className={c("signup-logo")}>
              <div className={c("signup-logo-mark")}>
                <LogoMark />
              </div>
              <div className={c("signup-logo-name")}>
                Robert<span>.</span>
              </div>
            </div>
            <div className={c("signup-title")}>התחל 7 ימים חינם</div>
            <div className={c("signup-sub")}>ללא כרטיס אשראי. מבטל מתי שרוצה.</div>
            <div className={c("fg")}>
              <label className={c("fl")}>שם מלא</label>
              <input
                className={c("fi")}
                placeholder="ישראל ישראלי"
                value={su.full_name}
                onChange={(e) => setSu({ ...su, full_name: e.target.value })}
              />
            </div>
            <div className={c("fg")}>
              <label className={c("fl")}>אימייל</label>
              <input
                className={c("fi")}
                type="email"
                placeholder="israel@gmail.com"
                value={su.email}
                onChange={(e) => setSu({ ...su, email: e.target.value })}
              />
            </div>
            <div className={c("fg")}>
              <label className={c("fl")}>סיסמה</label>
              <input
                className={c("fi")}
                type="password"
                placeholder="לפחות 8 תווים"
                value={su.password}
                onChange={(e) => setSu({ ...su, password: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: 16 }}></div>
            <button className={c("btn btn-primary")} onClick={doSignup}>
              יצירת חשבון בחינם
            </button>
            <div className={c("divd")}>
              <span>או</span>
            </div>
            <button className={c("btn btn-outline")} style={{ width: "100%", padding: 11 }} onClick={googleSignup}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              המשך עם Google
            </button>
            <div className={c("signup-terms")}>
              בהרשמה אתה מסכים ל<a href="/legal">תנאי השימוש</a> ו<a href="/legal">מדיניות הפרטיות</a>
            </div>
            <div className={c("signup-login")}>
              כבר יש לך חשבון? <a onClick={() => router.push("/login")}>התחבר</a>
            </div>
          </div>
        </div>
      </div>

      {/* SCREEN 2: ONBOARDING */}
      <div className={c("screen") + (screen === "ob" ? " " + styles.act : "")}>
        <div className={c("ob-header")}>
          <div className={c("ob-logo")}>
            <div className={c("ob-logo-mark")}>
              <LogoMark />
            </div>
            <div className={c("ob-logo-name")}>
              Robert<span>.</span>
            </div>
          </div>
          <div className={c("ob-step-label")}>שלב {curStep} מתוך {totalSteps}</div>
        </div>

        <div className={c("ob-progress")}>
          <div className={c("ob-steps-row")}>
            {["סוג עסק", "פרטי עסק", "שירותים", "סגנון", "וואטסאפ"].map((label, i) => {
              const n = i + 1;
              const state = n < curStep ? "done" : n === curStep ? "act" : "";
              return (
                <div
                  key={n}
                  className={c("ob-step-pill") + (state ? " " + styles[state] : "")}
                  onClick={() => jumpStep(n)}
                >
                  <div className={c("ob-step-circle")}>
                    {n < curStep ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      n
                    )}
                  </div>
                  <div className={c("ob-step-name")}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={c("ob-content")}>
          {/* STEP 1 */}
          <div className={c("ob-pane") + (curStep === 1 ? " " + styles.act : "")}>
            {catView === "main" ? (
              <div>
                <div className={c("pane-title")}>מה תחום העסק?</div>
                <div className={c("pane-sub")}>בחר קטגוריה ראשית — תוכל לבחור את הסוג המדויק בשלב הבא</div>
                <div className={c("btype-grid")}>
                  {MAIN_CATEGORIES.map((cat) => (
                    <div key={cat.key} className={c("btype-card")} onClick={() => openSub(cat.key)}>
                      <div className={c("btype-icon")}>{cat.icon}</div>
                      <div className={c("btype-name")}>{cat.name}</div>
                      <div className={c("btype-arrow")}>◂</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className={c("sub-header")}>
                  <button className={c("back-cat-btn")} onClick={() => setCatView("main")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    חזור לקטגוריות
                  </button>
                  <div className={c("sub-cat-label")}>
                    {activeCat && `${SUB_CATS[activeCat].icon} ${SUB_CATS[activeCat].label}`}
                  </div>
                </div>
                <div className={c("pane-sub")}>בחר את סוג העסק המדויק שלך</div>
                <div className={c("btype-grid")}>
                  {activeCat &&
                    SUB_CATS[activeCat].items.map((item, i) =>
                      item.name === "__ADD__" ? (
                        customOpen ? (
                          <div key={i} style={{ gridColumn: "1/-1", display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              className={c("fi")}
                              placeholder="שם העסק שלך..."
                              style={{ flex: 1, fontSize: 14 }}
                              autoFocus
                              value={customVal}
                              onChange={(e) => setCustomVal(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && confirmCustom()}
                            />
                            <button className={c("btn btn-primary btn-sm")} style={{ whiteSpace: "nowrap", flexShrink: 0, width: "auto" }} onClick={confirmCustom}>
                              אישור
                            </button>
                          </div>
                        ) : (
                          <div key={i} className={c("btype-card add-custom-card")} onClick={() => setCustomOpen(true)}>
                            <div className={c("btype-icon")} style={{ fontSize: 20, color: "var(--green-d)" }}>+</div>
                            <div className={c("btype-name")} style={{ color: "var(--green-d)" }}>הוסף ידנית</div>
                          </div>
                        )
                      ) : (
                        <div
                          key={i}
                          className={c("btype-card") + (bizSubtype === item.name ? " " + styles.sel : "")}
                          onClick={() => selSub(item.name)}
                        >
                          <div className={c("btype-icon")}>{item.icon}</div>
                          <div className={c("btype-name")}>{item.name}</div>
                        </div>
                      ),
                    )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2 */}
          <div className={c("ob-pane") + (curStep === 2 ? " " + styles.act : "")}>
            <div className={c("pane-title")}>פרטי העסק</div>
            <div className={c("pane-sub")}>Robert ישתמש בפרטים אלה כשיענה ללקוחות שלך</div>

            <div className={c("section-card")}>
              <div className={c("section-card-title")}>מידע בסיסי</div>
              <div className={c("fg")}>
                <label className={c("fl")}>שם העסק</label>
                <input className={c("fi")} placeholder="מספרת מיטל" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
              </div>
              <div className={c("fg")}>
                <label className={c("fl")}>תיאור קצר</label>
                <textarea className={c("fta")} placeholder="ספר על העסק שלך — מה אתה מציע, מה מיוחד בך..." value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} />
                <span className={c("fhint")}>Robert ישתמש בזה כדי לענות על שאלות כלליות</span>
              </div>
              <div className={c("form-2")}>
                <div className={c("fg")}>
                  <label className={c("fl")}>כתובת</label>
                  <input className={c("fi")} placeholder="רחוב, עיר" value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
                </div>
                <div className={c("fg")}>
                  <label className={c("fl")}>טלפון ליצירת קשר</label>
                  <input className={c("fi")} placeholder="050-0000000" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
                </div>
              </div>
              <div className={c("fg")}>
                <label className={c("fl")}>קישור לאתר / אינסטגרם (אופציונלי)</label>
                <input className={c("fi")} placeholder="https://..." value={details.link} onChange={(e) => setDetails({ ...details, link: e.target.value })} />
              </div>
            </div>

            <div className={c("section-card")}>
              <div className={c("section-card-title")}>
                שעות פעילות
                <span className={c("badge badge-green")}>ניתן לעריכה בכל עת</span>
              </div>
              <table className={c("hours-table")}>
                <thead>
                  <tr>
                    <th>יום</th>
                    <th>פתוח</th>
                    <th>משעה</th>
                    <th>עד שעה</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS_HE.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <span className={c("day-name")}>{d}&apos;</span>
                      </td>
                      <td>
                        <label className={c("tog")}>
                          <input
                            type="checkbox"
                            checked={!hours[i].closed}
                            onChange={(e) => {
                              const next = [...hours];
                              next[i] = { ...next[i], closed: !e.target.checked };
                              setHours(next);
                            }}
                          />
                          <span className={c("tog-sl")}></span>
                        </label>
                      </td>
                      <td>
                        <input
                          className={c("time-input")}
                          type="time"
                          value={hours[i].open}
                          disabled={hours[i].closed}
                          onChange={(e) => {
                            const next = [...hours];
                            next[i] = { ...next[i], open: e.target.value };
                            setHours(next);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className={c("time-input")}
                          type="time"
                          value={hours[i].close}
                          disabled={hours[i].closed}
                          onChange={(e) => {
                            const next = [...hours];
                            next[i] = { ...next[i], close: e.target.value };
                            setHours(next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* STEP 3 */}
          <div className={c("ob-pane") + (curStep === 3 ? " " + styles.act : "")}>
            <div className={c("pane-title")}>השירותים שלך</div>
            <div className={c("pane-sub")}>הוסף את השירותים והמחירים שלך — Robert ידע לענות עליהם. ניתן לערוך ולהוסיף בכל עת.</div>

            <div className={c("section-card")}>
              <div className={c("section-card-title")}>
                רשימת שירותים
                <span className={c("badge badge-green")}>ניתן לעריכה בכל עת</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 28px", gap: 6, padding: "4px 12px 8px", borderBottom: "1px solid var(--bdr)", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t4)" }}>שם השירות</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t4)", textAlign: "center" }}>מחיר</span>
                <span></span>
              </div>
              <div>
                {services.map((s, i) => (
                  <div className={c("service-item")} key={i}>
                    <span className={c("si-drag")} title="גרור לסידור מחדש">⠿</span>
                    <input
                      className={c("si-name")}
                      placeholder="שם השירות"
                      value={s.name}
                      onChange={(e) => {
                        const next = [...services];
                        next[i] = { ...next[i], name: e.target.value };
                        setServices(next);
                      }}
                    />
                    <input
                      className={c("si-price")}
                      placeholder="₪0"
                      value={s.price}
                      onChange={(e) => {
                        const next = [...services];
                        next[i] = { ...next[i], price: e.target.value };
                        setServices(next);
                      }}
                    />
                    <span className={c("si-del")} onClick={() => setServices(services.filter((_, j) => j !== i))}>×</span>
                  </div>
                ))}
              </div>
              <button className={c("add-btn")} onClick={() => setServices([...services, { name: "", price: "" }])}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                הוסף שירות
              </button>
            </div>

            <div className={c("section-card")}>
              <div className={c("section-card-title")}>שאלות נפוצות</div>
              <div>
                {faqs.map((f, i) => (
                  <div className={c("faq-item")} key={i}>
                    <div className={c("faq-q-row")}>
                      <input
                        placeholder="שאלה..."
                        value={f.question}
                        onChange={(e) => {
                          const next = [...faqs];
                          next[i] = { ...next[i], question: e.target.value };
                          setFaqs(next);
                        }}
                      />
                      <span className={c("faq-del")} onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}>×</span>
                    </div>
                    <textarea
                      className={c("faq-a-row")}
                      rows={2}
                      placeholder="תשובה..."
                      value={f.answer}
                      onChange={(e) => {
                        const next = [...faqs];
                        next[i] = { ...next[i], answer: e.target.value };
                        setFaqs(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <button className={c("add-btn")} onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                הוסף שאלה ותשובה
              </button>
            </div>
          </div>

          {/* STEP 4 */}
          <div className={c("ob-pane") + (curStep === 4 ? " " + styles.act : "")}>
            <div className={c("pane-title")}>איך Robert מדבר?</div>
            <div className={c("pane-sub")}>בחר את הסגנון שהכי מתאים לעסק שלך</div>

            <div className={c("style-grid")} style={{ marginBottom: 16 }}>
              {STYLE_OPTIONS.map((opt, i) => (
                <div
                  key={i}
                  className={c("style-card") + (styleIdx === i ? " " + styles.sel : "")}
                  onClick={() => setStyleIdx(i)}
                >
                  <div className={c("style-card-badge " + opt.badgeClass)}>{opt.badge}</div>
                  <div className={c("style-card-name")}>{opt.name}</div>
                  <div className={c("style-card-ex")}>{opt.ex}</div>
                </div>
              ))}
            </div>

            <div className={c("section-card")}>
              <div className={c("section-card-title")}>הגדרות נוספות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[
                  ["מסירה לנציג אנושי", "כשהבוט לא יודע לענות — מעביר אליך", true],
                  ["מצב שינה מחוץ לשעות פעילות", "שולח הודעה אוטומטית מחוץ לשעות", true],
                  ["קבלת פניות חדשות בSMS", "התראה כשמגיעה שיחה חדשה", false],
                ].map(([title, sub, def], i, arr) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--bdr)" : "none" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
                      <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>{sub}</div>
                    </div>
                    <label className={c("tog")}>
                      <input type="checkbox" defaultChecked={def as boolean} />
                      <span className={c("tog-sl")}></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 5 */}
          <div className={c("ob-pane") + (curStep === 5 ? " " + styles.act : "")}>
            <div className={c("pane-title")}>חיבור לוואטסאפ</div>
            <div className={c("pane-sub")}>חבר את המספר העסקי שלך — Robert יתחיל לענות מיד</div>

            <div className={c("section-card")}>
              <div className={c("section-card-title")}>המספר העסקי שלך</div>
              <div className={c("fg")}>
                <label className={c("fl")}>מספר וואטסאפ</label>
                <input className={c("fi")} placeholder="050-0000000" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} />
                <span className={c("fhint")}>המספר שעליו הלקוחות שלך כותבים לך</span>
              </div>
              <button className={c("btn btn-primary")} style={{ maxWidth: 200, width: "auto" }} onClick={sendCode}>
                שלח קוד אימות
              </button>
              {codeSent && (
                <div style={{ marginTop: 14 }}>
                  <div className={c("fg")}>
                    <label className={c("fl")}>קוד שהתקבל ב-SMS</label>
                    <input className={c("fi")} placeholder="000000" maxLength={6} style={{ letterSpacing: 6, textAlign: "center", fontSize: 18, fontWeight: 700 }} />
                  </div>
                  <button className={c("btn btn-outline btn-sm")} style={{ width: "auto" }} onClick={() => toast("המספר אומת בהצלחה")}>
                    אמת קוד
                  </button>
                </div>
              )}
            </div>

            <div className={c("connect-steps-list")}>
              {[
                ["הכנס את המספר העסקי", "המספר שעליו הלקוחות כותבים לך כיום"],
                ["קבל קוד אימות ב-SMS", "תוך כ-30 שניות תקבל SMS עם קוד 6 ספרות"],
                ["Robert פעיל מיד", "הבוט שלך יתחיל לענות ללקוחות תוך דקות"],
              ].map(([title, sub], i) => (
                <div className={c("cstep")} key={i}>
                  <div className={c("cstep-num")}>{i + 1}</div>
                  <div>
                    <div className={c("cstep-title")}>{title}</div>
                    <div className={c("cstep-sub")}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={c("section-card")} style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.6 }}>
                  חיבור המספר מנתק אותו מאפליקציית וואטסאפ הרגילה. מומלץ להשתמש במספר עסקי נפרד. ניתן לנהל שיחות דרך ה-Inbox במערכת.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* footer nav */}
        <div className={c("ob-footer")}>
          <button className={c("btn btn-outline")} style={{ display: curStep > 1 ? "flex" : "none", width: "auto" }} onClick={prevStep}>
            חזור
          </button>
          <div style={{ flex: 1 }}></div>
          <button className={c("btn btn-primary")} style={{ maxWidth: 160, width: "auto" }} onClick={nextStep}>
            {curStep === totalSteps ? "סיום וכניסה" : "המשך"}
          </button>
        </div>
      </div>

      {/* SCREEN 3: SUCCESS */}
      <div className={c("screen") + (screen === "success" ? " " + styles.act : "")}>
        <div className={c("success-wrap")}>
          <div className={c("success-card")}>
            <div className={c("success-icon")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className={c("success-title")}>הבוט שלך מוכן!</div>
            <div className={c("success-sub")}>
              Robert כבר עונה ללקוחות שלך. עכשיו תוכל לנהל, לערוך ולהוסיף עוד בוטים מה-Dashboard.
            </div>
            <div className={c("success-details")}>
              <div className={c("sd-row")}>
                <span className={c("sd-label")}>שם הבוט</span>
                <span className={c("sd-val")}>{successInfo.botName}</span>
              </div>
              <div className={c("sd-row")}>
                <span className={c("sd-label")}>מספר וואטסאפ</span>
                <span className={c("sd-val")}>{successInfo.wa}</span>
              </div>
              <div className={c("sd-row")}>
                <span className={c("sd-label")}>סטטוס</span>
                <span className={c("sd-val")} style={{ color: "var(--green-d)" }}>פעיל</span>
              </div>
            </div>
            <button className={c("btn btn-primary")} onClick={() => router.push("/dashboard")}>
              כניסה ל-Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
