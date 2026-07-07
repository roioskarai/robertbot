"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./onboarding.module.css";
import { scoped } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import ThemeToggle from "@/components/ThemeToggle";
import ManualConnectWizard from "@/components/ManualConnectWizard";
import {
  MAIN_CATEGORIES,
  SUB_CATS,
  DAYS_HE,
  DAY_KEYS,
  SERVICES_BY_CATEGORY,
  GENERIC_SERVICES,
  examplesFor,
} from "./subcats";
import type { BotStyle, Service, FaqItem, WorkingHours } from "@/lib/types";
import { isValidEmail, isValidPhoneIL } from "@/lib/validation";

const c = scoped(styles);

// True when no real Supabase backend is configured (placeholder/demo).
// Mirrors the dashboard's check so the wizard still completes offline,
// while a real backend gates progression on a successful signup.
const DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

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

// Live password-strength meter (0–4). Pure UI hint — the hard rule (8+ chars)
// is still enforced in validation + on the server.
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "#e2e8f0" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  s = Math.min(4, s);
  const map = [
    { label: "", color: "#e2e8f0" },
    { label: "חלשה", color: "#ef4444" },
    { label: "סבירה", color: "#f59e0b" },
    { label: "טובה", color: "var(--green)" },
    { label: "חזקה", color: "var(--green-d)" },
  ];
  return { score: s, ...map[s] };
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
  // Redirected here after a failed email verification link (expired/already used).
  const hasVerifyError = searchParams.get("verify-error") === "1";
  // Optional template pre-selection from the dashboard "השתמש בתבנית" buttons.
  const presetCat = searchParams.get("cat");

  const [screen, setScreen] = useState<"signup" | "verify" | "ob" | "success">(
    startOnWizard ? "ob" : "signup",
  );

  useEffect(() => {
    if (hasVerifyError) {
      toast("הקישור פג תוקף. הזן את פרטיך שוב ונשלח קישור אימות חדש.");
    }
    // Pre-select a business category when arriving from a template card.
    if (startOnWizard && presetCat && MAIN_CATEGORIES.some((m) => m.key === presetCat)) {
      openSub(presetCat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [curStep, setCurStep] = useState(1);

  // signup
  const [su, setSu] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    terms: false,
  });

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

  // step 3 — services + faq. Neutral defaults; openSub() replaces both with
  // category-appropriate examples the moment a business type is chosen (#10).
  const [services, setServices] = useState<Service[]>(
    GENERIC_SERVICES.map((x) => ({ ...x })),
  );
  const [faqs, setFaqs] = useState<FaqItem[]>(
    examplesFor(null).faq.map((x) => ({ ...x })),
  );

  // step 4 — style
  const [styleIdx, setStyleIdx] = useState(0);

  // step 5 — whatsapp
  // step 5 — real manual-connect wizard (number → OTP → verified token).
  // The token is consumed by POST /api/bots so the bot is created connected.
  const [waPhone, setWaPhone] = useState("");
  const [waCode, setWaCode] = useState("");
  const [waStep, setWaStep] = useState<"idle" | "sent" | "success">("idle");
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waVerified, setWaVerified] = useState<{ number: string; token: string } | null>(null);
  const [waManualEnabled, setWaManualEnabled] = useState(true);

  // success
  const [successInfo, setSuccessInfo] = useState({ botName: "", wa: "", connected: false });
  const [newBotId, setNewBotId] = useState<string | null>(null);

  const totalSteps = 5;

  // ── signup ui
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  // Per-field inline errors (#4/#7) — replaces toast-only validation so the
  // signup card points at exactly what needs fixing.
  const [suErrors, setSuErrors] = useState<Record<string, string>>({});

  function validateSignup(): Record<string, string> {
    const errors: Record<string, string> = {};
    const first = su.first_name.trim();
    const last = su.last_name.trim();
    const email = su.email.trim();
    const phone = su.phone.trim();
    if (!first) errors.first_name = "נא להזין שם פרטי";
    if (!last) errors.last_name = "נא להזין שם משפחה";
    if (!isValidEmail(email)) errors.email = "נא להזין כתובת מייל תקינה";
    if (!isValidPhoneIL(phone)) errors.phone = "נא להזין מספר טלפון ישראלי תקין";
    if (su.password.length < 8) errors.password = "הסיסמה חייבת להכיל לפחות 8 תווים";
    if (su.password !== su.confirm) errors.confirm = "הסיסמאות אינן תואמות";
    if (!su.terms) errors.terms = "יש לאשר את תנאי השימוש ומדיניות הפרטיות";
    return errors;
  }

  function suField<K extends keyof typeof su>(key: K, value: (typeof su)[K]) {
    setSu((prev) => ({ ...prev, [key]: value }));
    setSuErrors((prev) => (prev[key as string] ? { ...prev, [key as string]: "" } : prev));
  }

  async function doSignup() {
    if (signingUp) return; // guard against double-submit

    // ── client-side validation (runs in demo + real so the UX is consistent
    //    and the user can't advance with empty/invalid/mismatched data) ──
    const errors = validateSignup();
    setSuErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast(Object.values(errors)[0]);
      return;
    }

    // In demo mode there's no real backend — keep the original "always
    // advance" UX so the wizard is fully explorable offline.
    if (DEMO_MODE) {
      setScreen("ob");
      return;
    }

    setSigningUp(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: su.first_name.trim(), last_name: su.last_name.trim(), phone: su.phone.trim(), email: su.email.trim(), password: su.password }),
      });
      if (!res.ok) {
        // Real failure (weak password / duplicate email / rate-limit):
        // stay on the signup step and surface the Hebrew error.
        const d = await res.json().catch(() => ({}));
        toast(d.error || "ההרשמה נכשלה. בדוק את הפרטים ונסה שוב.");
        return;
      }
      // With Supabase "Confirm email" ON, signUp returns no session until the
      // user verifies their email. Gate the wizard behind email verification
      // (#3); if a session already exists (confirmation disabled), go straight in.
      const d = await res.json().catch(() => ({}));
      if (d && d.hasSession) {
        setScreen("ob");
      } else {
        // Tell the user the truth about whether the code email actually went out.
        setEmailFailed(d?.emailSent === false);
        if (d?.resent && d?.emailSent !== false) {
          toast("קוד אימות חדש נשלח לתיבת הדואר שלך.");
        }
        setScreen("verify");
      }
    } catch {
      toast("אין חיבור לשרת — נסה שוב.");
    } finally {
      setSigningUp(false);
    }
  }

  // #3 — resend OTP: re-call the signup endpoint which regenerates + resends.
  const [resending, setResending] = useState(false);
  // True when the server reported the OTP email did NOT go out — drives a
  // blocking error card on the verify screen (not just a transient toast).
  const [emailFailed, setEmailFailed] = useState(false);
  async function resendVerification() {
    if (resending) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: su.email.trim(), password: su.password, first_name: su.first_name.trim(), last_name: su.last_name.trim(), phone: su.phone.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "שליחה נכשלה — נסה שוב.");
      } else if (d?.emailSent === false) {
        setEmailFailed(true);
      } else {
        setEmailFailed(false);
        toast("קוד אימות חדש נשלח לתיבת הדואר שלך.");
      }
    } catch {
      toast("שליחה נכשלה — נסה שוב.");
    } finally {
      setResending(false);
    }
  }

  // #3b — verify the 6-digit OTP code the user entered.
  async function verifyOtp() {
    const code = otpCode.trim();
    if (code.length !== 6) { toast("הזן קוד בן 6 ספרות"); return; }
    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: su.email.trim(), code }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast(d.error || "הקוד שגוי. נסה שוב."); return; }
      // OTP verified — sign in (server confirmed email_confirm: true).
      const supabase = createClient();
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: su.email.trim(),
        password: su.password,
      });
      if (loginErr) {
        toast("אימות הצליח אך ההתחברות נכשלה. נסה להתחבר מדף ההתחברות.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast("אין חיבור לשרת — נסה שוב.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function googleSignup() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) toast("התחברות עם Google נכשלה — נסה שוב.");
    } catch {
      toast("התחברות עם Google אינה זמינה כרגע.");
    }
  }

  // ── step 1
  function openSub(catKey: string) {
    setActiveCat(catKey);
    setBizType(catKey);
    setCatView("sub");
    setCustomOpen(false);
    setCustomVal("");
    // #4 + #10 — load services AND example FAQs that fit the chosen business
    // type, so nothing shows the hair-salon defaults once a category is picked.
    setServices((SERVICES_BY_CATEGORY[catKey] ?? GENERIC_SERVICES).map((x) => ({ ...x })));
    setFaqs(examplesFor(catKey).faq.map((x) => ({ ...x })));
  }
  // Advance off a delayed timeout without calling nextStep()/stepValid()
  // directly: those close over the pre-selection render's stale bizSubtype
  // (still null at the moment the timeout is scheduled), which — once
  // nextStep() started gating on stepValid() (#6) — made the delayed call
  // spuriously fail validation and flip showStepError back on after the
  // step had already advanced. The functional setCurStep update always
  // reads live state, and the s===1 guard no-ops if the user already left
  // step 1 (e.g. via a manual "המשך" click) before the timeout fires.
  function autoAdvanceFromStep1(delayMs: number) {
    setShowStepError(false);
    setTimeout(() => {
      setCurStep((s) => (s === 1 ? Math.min(totalSteps, s + 1) : s));
    }, delayMs);
  }
  function selSub(name: string) {
    setBizSubtype(name);
    autoAdvanceFromStep1(350);
  }
  function confirmCustom() {
    if (!customVal.trim()) {
      toast("נא להכניס שם");
      return;
    }
    setBizSubtype(customVal.trim());
    autoAdvanceFromStep1(200);
  }

  // ── step validation (#6) — blocks advancing on empty required fields,
  // with an inline hint at the offending field instead of a silent skip.
  const [showStepError, setShowStepError] = useState(false);
  function stepValid(step: number): boolean {
    switch (step) {
      case 1: return !!bizSubtype;
      case 2: return details.name.trim().length > 0;
      case 3: return services.some((s) => s.name.trim().length > 0);
      default: return true;
    }
  }
  function stepInvalidHint(step: number): string {
    switch (step) {
      case 1: return "בחר את סוג העסק שלך כדי להמשיך";
      case 2: return "נא להזין את שם העסק";
      case 3: return "הוסף לפחות שירות אחד עם שם";
      default: return "";
    }
  }

  // ── navigation
  function nextStep() {
    if (!stepValid(curStep)) {
      setShowStepError(true);
      toast(stepInvalidHint(curStep));
      return;
    }
    setShowStepError(false);
    // On the last step, submit instead of advancing. finish() is called
    // directly (never inside a state updater) so it runs exactly once.
    if (curStep === totalSteps) {
      void finish();
      return;
    }
    setCurStep((s) => Math.min(totalSteps, s + 1));
  }
  function prevStep() {
    setShowStepError(false);
    setCurStep((s) => Math.max(1, s - 1));
  }
  function jumpStep(n: number) {
    setShowStepError(false);
    setCurStep((s) => (n <= s ? n : s));
  }

  function buildWorkingHours(): WorkingHours {
    const wh = {} as WorkingHours;
    DAY_KEYS.forEach((k, i) => {
      wh[k] = { open: hours[i].open, close: hours[i].close, closed: hours[i].closed };
    });
    return wh;
  }

  // ── step 5 wizard handlers (bot-agnostic verify via /api/whatsapp/verify)
  // Pre-detect a half-configured Twilio so the wizard shows a friendly note
  // instead of a 503 on "שלח קוד".
  useEffect(() => {
    if (DEMO_MODE || curStep !== 5 || screen !== "ob") return;
    fetch("/api/whatsapp/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setWaManualEnabled(d.manualEnabled ?? true); })
      .catch(() => {}); // fail-open — the verify route returns a friendly 503
  }, [curStep, screen]);

  async function waSendCode() {
    const num = waPhone.trim();
    if (!isValidPhoneIL(num)) {
      setWaError("מספר טלפון לא תקין — הזן מספר וואטסאפ ישראלי תקין");
      return;
    }
    setWaError(null);
    if (DEMO_MODE) {
      setWaStep("sent");
      toast("מצב הדגמה — הזן קוד כלשהו");
      return;
    }
    setWaBusy(true);
    try {
      const res = await fetch("/api/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWaError(d.error || "שליחת הקוד נכשלה. נסה שוב.");
        return;
      }
      setWaStep("sent");
      if (d.demo) toast("סביבת פיתוח — הזן קוד כלשהו");
    } catch {
      setWaError("אין חיבור לשרת — נסה שוב.");
    } finally {
      setWaBusy(false);
    }
  }

  async function waVerifyCode() {
    const num = waPhone.trim();
    if (waCode.trim().length < 4) {
      setWaError("הזן את הקוד שקיבלת");
      return;
    }
    setWaError(null);
    if (DEMO_MODE) {
      setWaVerified({ number: num, token: "demo" });
      setWaStep("success");
      return;
    }
    setWaBusy(true);
    try {
      const res = await fetch("/api/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, code: waCode.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.token) {
        setWaError(d.error || "אימות הקוד נכשל. נסה שוב.");
        return;
      }
      setWaVerified({ number: (d.number as string) ?? num, token: d.token as string });
      setWaStep("success");
    } catch {
      setWaError("אין חיבור לשרת — נסה שוב.");
    } finally {
      setWaBusy(false);
    }
  }

  function waChangeNumber() {
    setWaStep("idle");
    setWaCode("");
    setWaError(null);
    setWaVerified(null);
  }

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  /**
   * waOverride: undefined = use the wizard's verified state;
   * null = explicit skip (create without a number).
   */
  async function finish(waOverride?: { number: string; token: string } | null) {
    if (finishing) return; // guard against a double POST → duplicate bot
    setFinishing(true);
    setFinishError(null);

    const wa = waOverride === undefined ? waVerified : waOverride;
    const botName = details.name || "הבוט שלי";
    setSuccessInfo({ botName, wa: wa?.number || "---", connected: !!wa });

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
      // Verified at step 5 → the server validates the token and creates the
      // bot already connected (whatsapp_number + active).
      ...(wa ? { whatsapp_number: wa.number, wa_verify_token: wa.token } : {}),
    };

    // Demo mode — no real backend; complete the wizard deterministically.
    if (DEMO_MODE) {
      setScreen("success");
      return;
    }

    // Create the bot as a draft. WhatsApp connection (with real SMS/Meta
    // verification) is completed afterwards from the Dashboard — we never
    // attach a number here without verifying ownership.
    // A server rejection (plan limit, expired session, 500) must surface to
    // the user and keep them on the wizard — never a fake success screen.
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.bot?.id) {
        const msg =
          res.status === 401
            ? "ההתחברות פגה — התחבר מחדש כדי לסיים את ההקמה"
            : (typeof json?.error === "string" && json.error) || "יצירת הבוט נכשלה. נסה שוב.";
        setFinishError(msg);
        toast(msg);
        setFinishing(false);
        return;
      }
      // Capture the new bot id so the success CTA can open its WhatsApp
      // connect step directly (#14).
      setNewBotId(json.bot.id as string);
      setScreen("success");
    } catch {
      const msg = "אין חיבור לשרת — בדוק את החיבור ונסה שוב.";
      setFinishError(msg);
      toast(msg);
      setFinishing(false);
    }
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
            <div style={{ display: "flex", gap: 10 }}>
              <div className={c("fg")} style={{ flex: 1 }}>
                <label className={c("fl")}>שם פרטי</label>
                <input
                  className={c("fi")}
                  placeholder="ישראל"
                  autoComplete="given-name"
                  value={su.first_name}
                  onChange={(e) => suField("first_name", e.target.value)}
                />
                {suErrors.first_name && <div className={c("field-err")}>{suErrors.first_name}</div>}
              </div>
              <div className={c("fg")} style={{ flex: 1 }}>
                <label className={c("fl")}>שם משפחה</label>
                <input
                  className={c("fi")}
                  placeholder="ישראלי"
                  autoComplete="family-name"
                  value={su.last_name}
                  onChange={(e) => suField("last_name", e.target.value)}
                />
                {suErrors.last_name && <div className={c("field-err")}>{suErrors.last_name}</div>}
              </div>
            </div>
            <div className={c("fg")}>
              <label className={c("fl")}>אימייל</label>
              <input
                className={c("fi")}
                type="email"
                placeholder="israel@gmail.com"
                autoComplete="email"
                value={su.email}
                onChange={(e) => suField("email", e.target.value)}
              />
              {suErrors.email && <div className={c("field-err")}>{suErrors.email}</div>}
            </div>
            <div className={c("fg")}>
              <label className={c("fl")}>טלפון אישי</label>
              <input
                className={c("fi")}
                type="tel"
                inputMode="tel"
                placeholder="050-1234567"
                autoComplete="tel"
                value={su.phone}
                onChange={(e) => suField("phone", e.target.value)}
              />
              {suErrors.phone ? (
                <div className={c("field-err")}>{suErrors.phone}</div>
              ) : (
                <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 5 }}>
                  לעדכונים ואבטחה — זה לא המספר העסקי לבוט (אותו תחבר בהמשך)
                </div>
              )}
            </div>
            <div className={c("fg")}>
              <label className={c("fl")}>סיסמה</label>
              <div style={{ position: "relative" }}>
                <input
                  className={c("fi")}
                  type={showPw ? "text" : "password"}
                  placeholder="לפחות 8 תווים"
                  autoComplete="new-password"
                  value={su.password}
                  onChange={(e) => suField("password", e.target.value)}
                  style={{ paddingInlineStart: 40 }}
                />
                <button type="button" aria-label="הצג סיסמה" onClick={() => setShowPw(s => !s)} style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 4, display: "flex" }}>
                  {showPw
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              {su.password ? (() => {
                const st = passwordStrength(su.password);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 5, background: "#e2e8f0", borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(st.score / 4) * 100}%`, background: st.color, transition: "width .2s" }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: st.color, fontWeight: 600, minWidth: 38, textAlign: "left" }}>{st.label}</span>
                  </div>
                );
              })() : suErrors.password && (
                <div className={c("field-err")}>{suErrors.password}</div>
              )}
            </div>
            <div className={c("fg")}>
              <label className={c("fl")}>אימות סיסמה</label>
              <div style={{ position: "relative" }}>
                <input
                  className={c("fi")}
                  type={showConfirm ? "text" : "password"}
                  placeholder="הקלד שוב את הסיסמה"
                  autoComplete="new-password"
                  value={su.confirm}
                  onChange={(e) => suField("confirm", e.target.value)}
                  style={{ paddingInlineStart: 40 }}
                />
                <button type="button" aria-label="הצג סיסמה" onClick={() => setShowConfirm(s => !s)} style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 4, display: "flex" }}>
                  {showConfirm
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              {su.confirm.length > 0 && su.confirm !== su.password && (
                <div style={{ fontSize: 11.5, color: "#ef4444", marginTop: 5 }}>הסיסמאות אינן תואמות</div>
              )}
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "4px 0 4px", cursor: "pointer", fontSize: 12.5, color: "var(--t2)", lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={su.terms}
                onChange={(e) => suField("terms", e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--green)", flexShrink: 0, cursor: "pointer" }}
              />
              <span>
                קראתי ואני מסכים ל<a href="/legal" target="_blank" style={{ color: "var(--green)", fontWeight: 600 }}>תנאי השימוש</a> ול<a href="/legal" target="_blank" style={{ color: "var(--green)", fontWeight: 600 }}>מדיניות הפרטיות</a>
              </span>
            </label>
            {suErrors.terms && <div className={c("field-err")} style={{ marginBottom: 12 }}>{suErrors.terms}</div>}
            <div style={{ marginBottom: suErrors.terms ? 0 : 16 }} />
            <button className={c("btn btn-primary")} onClick={doSignup} disabled={signingUp}>
              {signingUp ? "יוצר חשבון..." : "יצירת חשבון בחינם"}
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
            <div className={c("signup-login")}>
              כבר יש לך חשבון? <a onClick={() => router.push("/login")}>התחבר</a>
            </div>
          </div>
        </div>
      </div>

      {/* SCREEN: VERIFY EMAIL — OTP code entry (#3) */}
      <div className={c("screen") + (screen === "verify" ? " " + styles.act : "")}>
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
            <div className={c("signup-title")}>אמת את כתובת המייל</div>
            {emailFailed ? (
              <div
                role="alert"
                style={{
                  background: "var(--error-50)",
                  border: "1px solid var(--error-500)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  fontSize: 13.5,
                  lineHeight: 1.7,
                  color: "var(--error-700)",
                  marginBottom: 14,
                }}
              >
                <strong>שליחת מייל האימות נכשלה.</strong>
                <br />
                החשבון שלך נוצר, אבל הקוד לא יצא. לחץ על &quot;שלח קוד חדש&quot; כדי לנסות שוב —
                ואם זה חוזר, פנה אלינו בתמיכה.
              </div>
            ) : (
              <div className={c("signup-sub")}>
                שלחנו קוד אימות בן 6 ספרות אל <strong>{su.email || "המייל שלך"}</strong>.<br />
                הזן אותו כאן כדי להמשיך.
              </div>
            )}

            {/* OTP code input — styled as big digit display */}
            <div style={{ margin: "20px 0" }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="_ _ _ _ _ _"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter") void verifyOtp(); }}
                autoFocus
                style={{
                  width: "100%",
                  fontSize: 36,
                  fontWeight: 900,
                  letterSpacing: 14,
                  textAlign: "center",
                  fontFamily: "'Courier New', monospace",
                  border: "2px solid var(--bdr2)",
                  borderRadius: 14,
                  padding: "18px 12px",
                  background: "var(--surface-2)",
                  color: "var(--t1)",
                  outline: "none",
                  direction: "ltr",
                }}
              />
            </div>

            <button
              className={c("btn btn-primary")}
              disabled={verifyingOtp || otpCode.length !== 6}
              onClick={verifyOtp}
            >
              {verifyingOtp ? "מאמת..." : "אמת ואיפשר כניסה ◄"}
            </button>
            <div style={{ marginBottom: 12 }}></div>
            <button
              className={c("btn btn-outline")}
              style={{ width: "100%", padding: 11 }}
              onClick={resendVerification}
              disabled={resending}
            >
              {resending ? "שולח..." : "שלח קוד חדש"}
            </button>
            <div className={c("signup-terms")}>
              הקוד תקף ל-10 דקות. לא קיבלת? בדוק בתיקיית הספאם או בקש קוד חדש.
            </div>
            <div className={c("signup-login")}>
              רוצה להתחיל מחדש? <a onClick={() => { setOtpCode(""); setScreen("signup"); }}>חזרה להרשמה</a>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={c("ob-step-label")}>שלב {curStep} מתוך {totalSteps}</div>
            <ThemeToggle />
          </div>
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
            {showStepError && !bizSubtype && (
              <div className={c("field-err")} style={{ marginBottom: 12 }} role="alert">בחר את סוג העסק שלך כדי להמשיך</div>
            )}
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
                <input className={c("fi")} placeholder={examplesFor(bizType).namePh} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
                {showStepError && !details.name.trim() && <div className={c("field-err")}>נא להזין את שם העסק</div>}
              </div>
              <div className={c("fg")}>
                <label className={c("fl")}>תיאור קצר</label>
                <textarea className={c("fta")} placeholder={examplesFor(bizType).descPh} value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} />
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
              <div style={{ overflowX: "auto" }}>
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
                        <label className={c("tog-row")}>
                          <span className={c("tog")}>
                            <input
                              type="checkbox"
                              checked={!hours[i].closed}
                              aria-label={`${d} — ${hours[i].closed ? "סגור" : "פתוח"}`}
                              onChange={(e) => {
                                const next = [...hours];
                                next[i] = { ...next[i], closed: !e.target.checked };
                                setHours(next);
                              }}
                            />
                            <span className={c("tog-sl")}></span>
                          </span>
                          <span className={c("tog-state") + (hours[i].closed ? " " + styles["tog-state-off"] : " " + styles["tog-state-on"])}>
                            {hours[i].closed ? "סגור" : "פתוח"}
                          </span>
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
          </div>

          {/* STEP 3 */}
          <div className={c("ob-pane") + (curStep === 3 ? " " + styles.act : "")}>
            <div className={c("pane-title")}>השירותים שלך</div>
            <div className={c("pane-sub")}>הוסף את השירותים והמחירים שלך — Robert ידע לענות עליהם. ניתן לערוך ולהוסיף בכל עת.</div>
            {showStepError && !services.some((s) => s.name.trim()) && (
              <div className={c("field-err")} style={{ marginBottom: 12 }} role="alert">הוסף לפחות שירות אחד עם שם</div>
            )}

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
                      <button type="button" className={c("faq-del")} title="מחק שאלה" aria-label="מחק שאלה" onClick={() => { if (window.confirm("למחוק את השאלה הזו?")) setFaqs(faqs.filter((_, j) => j !== i)); }}>🗑</button>
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

            {examplesFor(bizType).styleExample && (
              <div className={c("section-card")} style={{ marginBottom: 16 }}>
                <div className={c("section-card-title")}>כך זה יכול להישמע אצלך</div>
                <div style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.6 }}>
                  {examplesFor(bizType).styleExample}
                </div>
              </div>
            )}

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

          {/* STEP 5 — real guided connect wizard (1 מספר → 2 קוד → 3 הצלחה) */}
          <div className={c("ob-pane") + (curStep === 5 ? " " + styles.act : "")}>
            <div className={c("pane-title")}>חיבור לוואטסאפ</div>
            <div className={c("pane-sub")}>חבר ואמת את המספר העסקי שלך — Robert יתחיל לענות מיד</div>

            <div className={c("section-card")}>
              <div className={c("section-card-title")}>המספר העסקי שלך</div>
              {!waManualEnabled ? (
                <div style={{ fontSize: 12.5, color: "var(--t3)", lineHeight: 1.7 }}>
                  חיבור ידני יופעל בקרוב — אפשר לדלג ולחבר מאוחר יותר מה-Dashboard.
                </div>
              ) : (
                <ManualConnectWizard
                  classes={c}
                  step={waStep}
                  phone={waPhone}
                  code={waCode}
                  busy={waBusy}
                  error={waError}
                  onPhoneChange={(v) => { setWaPhone(v); setWaError(null); }}
                  onCodeChange={(v) => { setWaCode(v.replace(/\D/g, "")); setWaError(null); }}
                  onSendCode={waSendCode}
                  onVerify={waVerifyCode}
                  onResend={waSendCode}
                  onChangeNumber={waChangeNumber}
                  success={{
                    title: "המספר אומת בהצלחה!",
                    sub: "המספר יחובר לבוט שלך אוטומטית בסיום ההקמה.",
                  }}
                />
              )}
              {waStep !== "success" && (
                <button
                  type="button"
                  className={c("btn btn-ghost btn-xs")}
                  style={{ marginTop: 10, padding: 0 }}
                  onClick={() => { setWaVerified(null); finish(null); }}
                  disabled={finishing}
                >
                  דלג לעכשיו — אחבר מאוחר יותר מה-Dashboard
                </button>
              )}
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

        {/* creation failure — real error, wizard stays open (never fake success) */}
        {finishError && (
          <div className={c("field-err")} role="alert" style={{ margin: "0 auto 10px", maxWidth: 560, fontSize: 13, textAlign: "center" }}>
            {finishError}
            {finishError.includes("התחבר מחדש") && (
              <>
                {" "}
                <Link href="/login" style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>לכניסה</Link>
              </>
            )}
          </div>
        )}

        {/* footer nav */}
        <div className={c("ob-footer")}>
          <button className={c("btn btn-outline")} style={{ display: curStep > 1 ? "flex" : "none", width: "auto" }} onClick={prevStep}>
            חזור
          </button>
          <div style={{ flex: 1 }}></div>
          <button className={c("btn btn-primary")} style={{ maxWidth: 160, width: "auto" }} onClick={nextStep} disabled={finishing}>
            {curStep === totalSteps ? (finishing ? "יוצר בוט..." : "סיום וכניסה") : "המשך"}
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
            <div className={c("success-title")}>{successInfo.connected ? "הבוט שלך מוכן!" : "הבוט שלך כמעט מוכן!"}</div>
            <div className={c("success-sub")}>
              {successInfo.connected
                ? "הבוט מחובר לוואטסאפ ומתחיל לענות ללקוחות שכותבים למספר."
                : "הגדרת הבוט הושלמה. נותר רק לחבר את הוואטסאפ מה-Dashboard — וזהו, Robert יתחיל לענות ללקוחות."}
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
                {successInfo.connected ? (
                  <span className={c("sd-val")} style={{ color: "var(--green-d)" }}>מחובר לוואטסאפ</span>
                ) : (
                  <span className={c("sd-val")} style={{ color: "var(--amber, #d97706)" }}>ממתין לחיבור וואטסאפ</span>
                )}
              </div>
            </div>
            {successInfo.connected ? (
              <button className={c("btn btn-primary")} onClick={() => router.push("/dashboard")}>
                כניסה ל-Dashboard
              </button>
            ) : (
              <button
                className={c("btn btn-primary")}
                onClick={() => {
                  // #14 — hand off the new bot so the Dashboard opens straight on
                  // its WhatsApp connect step (verify + activate from there).
                  if (newBotId) {
                    try {
                      sessionStorage.setItem("rb_open_bot", JSON.stringify({ id: newBotId, tab: "connect" }));
                    } catch {
                      /* ignore storage errors */
                    }
                  }
                  router.push("/dashboard");
                }}
              >
                חבר וואטסאפ ב-Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
