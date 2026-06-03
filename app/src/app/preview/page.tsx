"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./preview.module.css";
import { scoped } from "@/lib/cx";
import type { Bot } from "@/lib/types";

const c = scoped(styles);

// Demo bot config (in the real app this is loaded from the saved bot).
const bot = {
  name: "מיטל",
  bizName: "מספרת מיטל",
  style: "friendly" as const,
  phone: "050-1234567",
  services: ["✂️ תספורת — ₪120", "💅 לק ג׳ל — ₪80", "🧖 טיפול פנים — ₪200"],
  hours: "א׳–ו׳ 09:00–19:00",
  address: "רחוב הרצל 12, תל אביב",
};

type Dir = "in" | "out" | "system";
interface Bubble {
  dir: Dir;
  text: string;
  btns?: string[];
  time: string;
}

interface ScenarioStep {
  from: "bot" | "user";
  text: string;
  btns?: string[];
  style?: "system";
}

const scenarios: Record<string, ScenarioStep[]> = {
  welcome: [
    { from: "bot", text: `היי! 👋 אני ${bot.name}, הנציג של ${bot.bizName}.\nשמחים שפנית! במה אוכל לעזור?`, btns: ["📅 קביעת תור", "💰 מחירים", "🕐 שעות פעילות", "👤 נציג"] },
  ],
  appointment: [
    { from: "user", text: "אני רוצה לקבוע תור" },
    { from: "bot", text: "סופר! 🎉 איזה שירות תרצה?", btns: bot.services },
    { from: "user", text: "✂️ תספורת — ₪120" },
    { from: "bot", text: "מצוין! 💇 איזה תאריך נוח לך?", btns: ["ראשון 15.6", "שלישי 17.6", "חמישי 19.6", "ראשון 22.6", "תאריך אחר"] },
    { from: "user", text: "שלישי 17.6" },
    { from: "bot", text: "יופי! 🗓️ השעות הפנויות ב-17.6:", btns: ["09:00", "10:30", "13:00", "15:30", "17:00"] },
    { from: "user", text: "13:00" },
    { from: "bot", text: `✅ אשר את הפרטים:\n\n📋 תספורת\n📅 שלישי 17.6\n🕐 13:00\n📍 ${bot.address}\n💰 ₪120\n\nהכל נכון?`, btns: ["✅ אשר תור", "✏️ שנה פרטים"] },
    { from: "user", text: "✅ אשר תור" },
    { from: "bot", text: '🎉 התור נקבע!\nישלח אליך תזכורת יום לפני.\nלביטול — שלח "בטל תור".' },
  ],
  outside_hours: [
    { from: "user", text: "שלום, רציתי לשאול" },
    { from: "bot", text: `היי! 🌙 אנחנו סגורים כרגע.\nשעות פעילות: ${bot.hours}\n\nמה תרצה לעשות?`, btns: ["📅 קבע תור למחר", "📩 השאר הודעה"] },
    { from: "user", text: "📅 קבע תור למחר" },
    { from: "bot", text: "בשמחה! 😊 איזה שירות תרצה?", btns: bot.services },
  ],
  handoff: [
    { from: "user", text: "אני רוצה לדבר עם בן אדם" },
    { from: "bot", text: "בטח! 👍\nמעביר אותך לנציג.\nנחזור אליך תוך כ-5 דקות." },
    { from: "bot", text: "[נציג אנושי ייצור איתך קשר]", style: "system" },
  ],
  notunderstood: [
    { from: "user", text: "מה המצב עם ה..." },
    { from: "bot", text: "לא הצלחתי להבין 🙈\nבחר מהתפריט ואסדר לך:", btns: ["📅 תור", "💰 מחיר", "🕐 שעות", "👤 נציג"] },
    { from: "user", text: "💰 מחיר" },
    { from: "bot", text: `המחירים שלנו:\n\n${bot.services.join("\n")}\n\nרוצה לקבוע תור?`, btns: ["📅 כן, קבע לי תור"] },
  ],
  review: [
    { from: "bot", text: "שלום! 😊 ביקרת אצלנו אתמול.\nאיך היה?", btns: ["⭐⭐⭐⭐⭐ מעולה", "⭐⭐⭐⭐ טוב", "⭐⭐⭐ בסדר", "👎 לא טוב"] },
    { from: "user", text: "⭐⭐⭐⭐⭐ מעולה" },
    { from: "bot", text: "תודה רבה! ❤️\nאם תרצה לשתף — ביקורת קצרה בגוגל עוזרת לנו מאוד 🙏", btns: ["⭐ כתוב ביקורת בגוגל", "📅 קבע תור הבא"] },
  ],
};

const SCENARIO_BTNS: { key: string; label: string }[] = [
  { key: "welcome", label: "👋 פתיחת שיחה" },
  { key: "appointment", label: "📅 קביעת תור" },
  { key: "outside_hours", label: "🌙 מחוץ לשעות" },
  { key: "handoff", label: "👤 מסירה לנציג" },
  { key: "notunderstood", label: "❓ לא הבין" },
  { key: "review", label: "⭐ חוות דעת" },
];

function nowTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PreviewPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [activeScenario, setActiveScenario] = useState("welcome");
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const playToken = useRef(0);
  const convState = useRef<string>("menu");
  const ctx = useRef<{ service?: string; date?: string; time?: string }>({});

  useEffect(() => {
    loadScenario("welcome");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, typing]);

  function add(dir: Dir, text: string, btns?: string[]) {
    setMessages((m) => [...m, { dir, text, btns, time: nowTime() }]);
  }

  async function loadScenario(key: string) {
    const token = ++playToken.current;
    setActiveScenario(key);
    setMessages([]);
    convState.current = "menu";
    ctx.current = {};
    const steps = scenarios[key] || [];
    for (const step of steps) {
      if (playToken.current !== token) return;
      if (step.from === "user") {
        add("out", step.text);
        await sleep(600);
      } else {
        setTyping(true);
        await sleep(900 + step.text.length * 12);
        if (playToken.current !== token) return;
        setTyping(false);
        if (step.style === "system") add("system", step.text);
        else add("in", step.text, step.btns);
        await sleep(step.btns ? 900 : 600);
      }
    }
  }

  async function handleQr(text: string) {
    add("out", text);
    await respondToQr(text);
  }

  async function respondToQr(text: string) {
    setTyping(true);
    await sleep(700);
    setTyping(false);

    if (bot.services.includes(text)) {
      convState.current = "picking_date";
      ctx.current.service = text;
      add("in", "מצוין! 💇 איזה תאריך נוח לך?", ["ראשון 15.6", "שלישי 17.6", "חמישי 19.6", "ראשון 22.6", "תאריך אחר"]);
      return;
    }
    const isDate = /^(ראשון|שני|שלישי|רביעי|חמישי|שישי)\s+\d{1,2}\.\d{1,2}$/.test(text) || text === "תאריך אחר";
    if (isDate || convState.current === "picking_date") {
      convState.current = "picking_time";
      ctx.current.date = text === "תאריך אחר" ? "התאריך שבחרת" : text;
      if (text === "תאריך אחר") add("in", "כתוב את התאריך שנוח לך (לדוגמא: 25.6) 📅");
      else add("in", `יופי! 🗓️ השעות הפנויות ב-${text}:`, ["09:00", "10:30", "13:00", "15:30", "17:00"]);
      return;
    }
    const isTime = /^\d{2}:\d{2}$/.test(text);
    if (isTime || convState.current === "picking_time") {
      convState.current = "confirming";
      ctx.current.time = text;
      const svc = (ctx.current.service || "").split(" — ")[0].replace(/^[^\s]+\s/, "");
      const price = (ctx.current.service || "").split("— ")[1] || "";
      add("in", `✅ אשר את הפרטים:\n\n📋 ${svc}\n📅 ${ctx.current.date || ""}\n🕐 ${text}\n📍 ${bot.address}\n💰 ${price}\n\nהכל נכון?`, ["✅ אשר תור", "✏️ שנה פרטים"]);
      return;
    }
    if (text.includes("אשר")) {
      convState.current = "menu";
      add("in", '🎉 התור נקבע!\nתקבל תזכורת יום לפני.\nלביטול — "בטל תור".');
      return;
    }
    if (text.includes("שנה") || text.includes("שינוי")) {
      convState.current = "picking_service";
      add("in", "בטח! 😊 מה תרצה לשנות?", ["שירות אחר", "תאריך אחר", "שעה אחרת"]);
      return;
    }
    if (text.includes("תור") || text.includes("קבע")) {
      convState.current = "picking_service";
      add("in", "בשמחה! 😊 איזה שירות תרצה?", bot.services);
    } else if (text.includes("מחיר") && !text.includes("₪")) {
      add("in", `המחירים שלנו:\n\n${bot.services.join("\n")}\n\nרוצה לקבוע תור?`, ["📅 כן, קבע לי תור"]);
    } else if (text.includes("שעות")) {
      add("in", `שעות פעילות:\n${bot.hours} 😊`, ["📅 קבע תור"]);
    } else if (text.includes("נציג") || text.includes("אדם")) {
      convState.current = "menu";
      add("in", "מעביר אותך לנציג. נחזור תוך כ-5 דקות. 👍");
    } else if (text.includes("גוגל") || text.includes("ביקורת")) {
      add("in", "מעביר אותך לגוגל... 🙏\nתודה שעוזר לנו לצמוח!");
    } else {
      add("in", "לא הצלחתי להבין 🙈\nבחר מהתפריט:", ["📅 תור", "💰 מחיר", "🕐 שעות", "👤 נציג"]);
    }
  }

  function localFallback(text: string) {
    if (text.includes("תור") || text.includes("לקבוע")) {
      add("in", "סופר! 🎉 איזה שירות תרצה?", bot.services);
    } else if (text.includes("מחיר") || text.includes("כמה")) {
      add("in", `המחירים שלנו:\n\n${bot.services.join("\n")}\n\nרוצה לקבוע תור?`, ["📅 כן, קבע לי תור", "🔙 חזור לתפריט"]);
    } else if (text.includes("שלום") || text.includes("היי") || text.includes("הי")) {
      add("in", `היי! 👋 אני ${bot.name}, הנציג של ${bot.bizName}.\nבמה אוכל לעזור?`, ["📅 קביעת תור", "💰 מחירים", "🕐 שעות", "👤 נציג"]);
    } else if (text.includes("שעות") || text.includes("פתוח")) {
      add("in", `שעות פעילות:\n${bot.hours} 😊`, ["📅 קבע תור"]);
    } else if (text.includes("בטל")) {
      add("in", "התור בוטל בהצלחה. ✅\nרוצה לקבוע תור חדש?", ["📅 כן", "🔙 לא תודה"]);
    } else {
      add("in", "לא הצלחתי להבין 🙈\nבחר מהתפריט:", ["📅 תור", "💰 מחיר", "🕐 שעות", "👤 נציג"]);
    }
  }

  async function sendMsg() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    add("out", text);
    setTyping(true);

    // Build a minimal Bot config for the AI engine.
    const botConfig: Partial<Bot> = {
      bot_name: bot.name,
      name: bot.bizName,
      description: `${bot.bizName} — ${bot.address}`,
      services: bot.services.map((s) => {
        const [n, p] = s.split(" — ");
        return { name: n, price: p || "" };
      }),
      faq: [],
      style: bot.style,
      address: bot.address,
      working_hours: null,
    };
    const history = messages
      .filter((m) => m.dir !== "system")
      .map((m) => ({ from_type: (m.dir === "out" ? "customer" : "bot") as "customer" | "bot", body: m.text }));

    try {
      const res = await fetch("/api/bots/preview/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, bot: botConfig }),
      });
      if (res.ok) {
        const d = await res.json();
        setTyping(false);
        add("in", d.text || "—", d.buttons?.length ? d.buttons : undefined);
        return;
      }
    } catch {
      /* fall through to local */
    }
    // No key / error → local keyword fallback.
    await sleep(500);
    setTyping(false);
    localFallback(text);
  }

  function goLive() {
    if (confirm("להפעיל את הבוט עכשיו?\n\nהוא יתחיל לענות ללקוחות האמיתיים שלך.")) {
      router.push("/dashboard");
    }
  }

  return (
    <div className={styles.preview}>
      {/* TOP BAR */}
      <div className={c("topbar")}>
        <div className={c("topbar-right")}>
          <div className={c("tb-logo")}>Robert<em>.</em></div>
          <div className={c("tb-title")}>תצוגה מקדימה</div>
        </div>
        <div className={c("preview-badge")}>
          <div className={c("preview-badge-dot")}></div>
          מצב הדגמה — לא שיחה אמיתית
        </div>
      </div>

      <div className={c("layout")}>
        {/* LEFT PANEL */}
        <div className={c("left-panel")}>
          <div className={c("lp-header")}>⚙️ הגדרות הבוט</div>
          <div className={c("lp-section")}>
            <div className={c("lp-label")}>פרטי בוט</div>
            <div className={c("lp-row")}><span className={c("lp-key")}>שם בוט</span><span className={c("lp-val green")}>{bot.name}</span></div>
            <div className={c("lp-row")}><span className={c("lp-key")}>שם עסק</span><span className={c("lp-val")}>{bot.bizName}</span></div>
            <div className={c("lp-row")}><span className={c("lp-key")}>סגנון</span><span className={c("lp-val")}>חברותי ונעים</span></div>
            <div className={c("lp-row")}><span className={c("lp-key")}>מספר</span><span className={c("lp-val")}>{bot.phone}</span></div>
            <a className={c("edit-link")} onClick={() => router.push("/dashboard")}>✏️ ערוך הגדרות</a>
          </div>
          <div className={c("lp-section")}>
            <div className={c("lp-label")}>שעות פעילות</div>
            <div className={c("lp-row")}><span className={c("lp-key")}>ראשון–שישי</span><span className={c("lp-val green")}>09:00–19:00</span></div>
            <div className={c("lp-row")}><span className={c("lp-key")}>שבת</span><span className={c("lp-val amber")}>סגור</span></div>
          </div>
          <div className={c("lp-section")}>
            <div className={c("lp-label")}>שירותים</div>
            <div className={c("lp-row")}><span className={c("lp-key")}>תספורת</span><span className={c("lp-val")}>₪120</span></div>
            <div className={c("lp-row")}><span className={c("lp-key")}>לק ג׳ל</span><span className={c("lp-val")}>₪80</span></div>
            <div className={c("lp-row")}><span className={c("lp-key")}>טיפול פנים</span><span className={c("lp-val")}>₪200</span></div>
          </div>
          <div className={c("scenarios")}>
            <div className={c("scenario-label")}>בדוק תרחישים</div>
            {SCENARIO_BTNS.map((s) => (
              <button key={s.key} className={c("scenario-btn") + (activeScenario === s.key ? " " + styles.act : "")} onClick={() => loadScenario(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* PHONE */}
        <div className={c("phone-wrap")}>
          <div className={c("phone")}>
            <div className={c("phone-notch")}></div>
            <div className={c("status-bar")}>
              <div className={c("status-dot")}></div>
              <div className={c("status-txt")}>הדגמה — כך הלקוח שלך רואה את הבוט</div>
            </div>
            <div className={c("wa-header")}>
              <span className={c("wa-back")}>‹</span>
              <div className={c("wa-av")}>{bot.name.charAt(0)}</div>
              <div>
                <div className={c("wa-name")}>{bot.name}</div>
                <div className={c("wa-status")}>🟢 מחובר · עונה תוך שניות</div>
              </div>
            </div>
            <div className={c("wa-body")} ref={bodyRef}>
              <div className={c("chat-date")}><span>היום</span></div>
              {messages.map((m, i) =>
                m.dir === "system" ? (
                  <div key={i} style={{ textAlign: "center", width: "100%" }}>
                    <span style={{ background: "rgba(0,0,0,.08)", color: "#555", fontSize: 10.5, padding: "3px 10px", borderRadius: 100 }}>{m.text}</span>
                  </div>
                ) : (
                  <div key={i} className={c("msg-wrap " + m.dir)}>
                    <div className={c("bubble " + m.dir)}>
                      <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, "<br>") }} />
                      <div className={c("btime")}>{m.time}</div>
                    </div>
                    {m.btns && m.btns.length > 0 && (
                      <div className={c("qr-row")}>
                        {m.btns.map((b, j) => (
                          <span key={j} className={c("qr")} onClick={() => handleQr(b)}>{b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
              {typing && (
                <div className={c("msg-wrap in")}>
                  <div className={c("typing")}><span></span><span></span><span></span></div>
                </div>
              )}
            </div>
            <div className={c("wa-input")}>
              <input
                className={c("wa-input-field")}
                placeholder="כתוב הודעה..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              />
              <button className={c("wa-send")} onClick={sendMsg}>
                <svg viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className={c("action-bar")}>
        <div className={c("action-label")}>בדקת את הבוט ונראה טוב? אפשר להפעיל אותו.</div>
        <button className={c("btn btn-outline")} onClick={() => loadScenario(activeScenario)}>🔄 אפס שיחה</button>
        <button className={c("btn btn-outline")} onClick={() => loadScenario("welcome")}>▶️ הרץ מחדש</button>
        <button className={c("btn btn-primary")} onClick={goLive}>🚀 הפעל בוט</button>
      </div>
    </div>
  );
}
