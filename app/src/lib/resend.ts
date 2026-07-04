import { Resend } from "resend";

export function hasResendKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY חסר — שליחת מיילים אינה זמינה");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Sender address, resolved at CALL time (not import time) so env changes and
 * tests behave predictably. Fail-closed in production: the sandbox fallback
 * (onboarding@resend.dev) can only deliver to the Resend account owner, which
 * silently breaks OTP delivery for real users — exactly the bug class we hit.
 */
function resolveFrom(): string {
  const from = process.env.RESEND_FROM;
  if (from) return from;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "RESEND_FROM חסר בפרודקשן — כתובת ה-sandbox של Resend אינה שולחת ללקוחות אמיתיים",
    );
  }
  return "Robert <onboarding@resend.dev>"; // dev/demo only
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Shared email shell — inline styles for max email-client compatibility. */
function shell(tagline: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:24px 16px;background:#f0f2f8;font-family:'Rubik',Arial,sans-serif;direction:rtl;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09);border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:28px 32px 24px;text-align:center;">
      <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-.3px;">Robert<span style="color:#22c55e;">.</span></div>
      <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px;">${tagline}</div>
    </div>
    <div style="padding:32px;">${bodyHtml}</div>
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="font-size:11.5px;color:#94a3b8;line-height:1.8;margin:0;">
        Robert · <a href="mailto:support@robertbot.co.il" style="color:#22c55e;text-decoration:none;font-weight:600;">support@robertbot.co.il</a>
      </p>
    </div>
  </div>
</body></html>`;
}

const btn = (href: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;padding:14px 36px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:15px;font-weight:700;text-decoration:none;">${label}</a></div>`;

const hi = (t: string) =>
  `<div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:10px;">${t}</div>`;

const text = (t: string) =>
  `<div style="font-size:14.5px;color:#475569;line-height:1.75;margin-bottom:20px;">${t}</div>`;

const infoRow = (k: string, v: string) =>
  `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #dcfce7;"><span style="font-size:13px;color:#64748b;">${k}</span><span style="font-size:13px;font-weight:700;color:#0f172a;">${v}</span></div>`;

const infoBox = (rows: string) =>
  `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin:16px 0;">${rows}</div>`;

// ── Templates ─────────────────────────────────────────────

export function welcomeEmail(opts: {
  name: string;
  plan: string;
  trialEndsAt: string;
  email: string;
}): { subject: string; html: string } {
  const body =
    hi(`ברוך הבא, ${opts.name}! 👋`) +
    text(
      `תודה שנרשמת ל-Robert. החשבון שלך נוצר בהצלחה ואתה מוכן להתחיל.<br><br>יש לך <strong>7 ימי ניסיון חינם</strong> לגלות איך Robert עונה ללקוחות שלך, קובע פגישות ומנהל שיחות — 24/7.`,
    ) +
    infoBox(
      infoRow("מסלול", opts.plan) +
        infoRow("ניסיון חינם עד", opts.trialEndsAt) +
        infoRow("מייל", opts.email),
    ) +
    btn(`${APP_URL}/dashboard`, "כניסה לאזור האישי ←");
  return { subject: "ברוך הבא ל-Robert 👋", html: shell("הבוט שעובד בשבילך 24/7", body) };
}

export function otpEmail(opts: { code: string }): {
  subject: string;
  html: string;
} {
  const body =
    hi("אמת את החשבון שלך") +
    text("קיבלנו בקשה לאמת את כתובת המייל שלך. הכנס את הקוד הבא באתר כדי להמשיך:") +
    `<div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:14px;padding:24px;text-align:center;margin:20px 0;">
       <div style="font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">קוד האימות שלך</div>
       <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#0f172a;font-family:'Courier New',monospace;">${opts.code}</div>
       <div style="font-size:12px;color:#94a3b8;margin-top:10px;">הקוד בתוקף ל-10 דקות בלבד</div>
     </div>
     <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:13px;color:#92400e;line-height:1.6;">🔒 אם לא ביקשת קוד זה — התעלם מהמייל. החשבון שלך בטוח.</div>`;
  return { subject: "קוד האימות שלך ל-Robert", html: shell("אימות חשבון", body) };
}

export function renewalEmail(opts: {
  name: string;
  plan: string;
  price: string;
  renewDate: string;
  last4: string;
  used: number;
  quota: number;
}): { subject: string; html: string } {
  const pct = opts.quota > 0 ? Math.min(100, Math.round((opts.used / opts.quota) * 100)) : 0;
  const body =
    hi("המנוי שלך מתחדש בקרוב") +
    text(
      `היי ${opts.name}, רצינו להזכיר שהמנוי שלך ל-Robert מתחדש אוטומטית בעוד <strong>3 ימים</strong>.`,
    ) +
    infoBox(
      infoRow("מסלול", opts.plan) +
        infoRow("סכום לחיוב", opts.price) +
        infoRow("תאריך חידוש", opts.renewDate) +
        infoRow("כרטיס אשראי", `•••• ${opts.last4}`),
    ) +
    `<div style="margin:16px 0;">
       <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:500;"><span>שימוש החודש</span><span>${opts.used} / ${opts.quota}</span></div>
       <div style="height:7px;background:#e2e8f0;border-radius:100px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#f59e0b,#d97706);"></div></div>
     </div>` +
    btn(`${APP_URL}/dashboard`, "ניהול המנוי ←");
  return {
    subject: "תזכורת: המנוי שלך ל-Robert מתחדש בקרוב",
    html: shell("תזכורת חידוש מנוי", body),
  };
}

export function trialEndingEmail(opts: { name: string; trialEndsAt: string }): {
  subject: string;
  html: string;
} {
  const body =
    hi(`היי ${opts.name}, הניסיון מסתיים בקרוב ⏳`) +
    text(
      `נשארו לך יומיים בלבד בתקופת הניסיון החינם (מסתיימת ב-<strong>${opts.trialEndsAt}</strong>).<br><br>כדי ש-Robert ימשיך לענות ללקוחות שלך ללא הפסקה — בחר מסלול עכשיו. ללא התחייבות, ביטול בכל עת.`,
    ) +
    btn(`${APP_URL}/dashboard`, "בחר מסלול והמשך ←");
  return { subject: "הניסיון החינם שלך ב-Robert מסתיים בקרוב", html: shell("תזכורת סיום ניסיון", body) };
}

// Hebrew labels for the agent registry names.
const AGENT_HE: Record<string, string> = {
  "conversation-analyst": "מנתח שיחות",
  retention: "שימור לקוחות",
  knowledge: "סוכן ידע",
  orchestrator: "מנצח התפעול",
};

/**
 * Daily owner report — the digest the ops-orchestrator sends to the platform
 * owner: one line per agent (status + Hebrew summary) and the count of
 * proposals waiting for approval.
 */
export function dailyOwnerReportEmail(opts: {
  date: string;
  items: { agent: string; status: string; summary: string; proposals: number }[];
}): { subject: string; html: string } {
  const dot = (s: string) =>
    s === "success" ? "🟢" : s === "skipped" ? "⚪" : "🔴";
  const rows = opts.items
    .map((i) => infoRow(`${dot(i.status)} ${AGENT_HE[i.agent] ?? i.agent}`, i.summary))
    .join("");
  const totalProposals = opts.items.reduce((n, i) => n + i.proposals, 0);
  const body =
    hi(`דוח יומי — ${opts.date} 🤖`) +
    text(
      `סיכום פעילות הסוכנים שמנהלים את Robert. <strong>${totalProposals} הצעות</strong> ממתינות לאישורך.`,
    ) +
    infoBox(rows) +
    btn(`${APP_URL}/dashboard`, "כניסה לאזור האישי ←");
  return {
    subject: `דוח יומי של Robert — ${totalProposals} הצעות ממתינות`,
    html: shell("הסוכנים מנהלים בשבילך", body),
  };
}

// ── Sender ────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  const from = resolveFrom(); // throws in prod when RESEND_FROM is missing
  // The Resend SDK does NOT throw on API errors (e.g. unverified domain) —
  // it returns { data, error }. We surface the error so callers' try/catch
  // works and the failure is visible in logs instead of vanishing silently.
  const { data, error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    const msg = typeof error === "string" ? error : (error.message || JSON.stringify(error));
    console.error("[resend] send failed:", { to, subject, from, error });
    throw new Error(msg);
  }
  return data;
}
