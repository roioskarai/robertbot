"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { scoped } from "@/lib/cx";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import PricingPlans from "@/components/PricingPlans";
import ConnectWhatsApp from "@/components/ConnectWhatsApp";
import type { Bot } from "@/lib/types";
import { isPlanId, planLabelHe, type PlanId } from "@/lib/plans";

const c = scoped(styles);

// True when no real Supabase backend is configured (placeholder/demo).
// Mirrors the server-side check in lib/agents/runner.ts so client actions
// know whether a real API exists — avoids fragile per-id "startsWith" guards.
const DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

const LogoMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8l4 4-4 4" />
  </svg>
);

// ── demo fallback data (used when not signed in / no Supabase) ──
const DEMO_BOTS: Partial<Bot>[] = [
  {
    id: "demo-1",
    name: "מספרת מיטל",
    bot_name: "מיטל",
    description: "עונה על שאלות, קובע תורים ומסביר על השירותים",
    whatsapp_number: "050-1234567",
    active: true,
    style: "friendly",
    faq: [],
    services: [],
  },
  {
    id: "demo-2",
    name: "גריל הבשרים",
    bot_name: "גריל",
    description: "תפריט, שעות פתיחה, הזמנת שולחן",
    whatsapp_number: "052-9876543",
    active: true,
    style: "friendly",
    faq: [],
    services: [],
  },
];

const BOT_COLORS = [
  { bg: "var(--green-pale)", color: "var(--green-text)" },
  { bg: "var(--purple-pale)", color: "var(--purple)" },
  { bg: "var(--blue-pale)", color: "var(--blue)" },
  { bg: "var(--amber-pale)", color: "var(--amber)" },
  { bg: "var(--red-pale)", color: "var(--red)" },
];

interface Analytics {
  messagesToday: number;
  openConversations: number;
  closedThisMonth: number;
  activeBots: number;
  totalBots: number;
  plan: string;
  quota: number;
  botLimit: number;
  messagesThisMonth: number;
  subscriptionStatus?: string;
  packBalance: number;
  weekly: number[];
  monthly: { label: string; count: number }[];
  metrics: { botAnsweredPct: number; handoffPct: number };
}

const DEMO_ANALYTICS: Analytics = {
  messagesToday: 47,
  openConversations: 3,
  closedThisMonth: 124,
  activeBots: 2,
  totalBots: 2,
  plan: "pro",
  quota: 1000,
  botLimit: 2,
  messagesThisMonth: 847,
  packBalance: 0,
  weekly: [32, 45, 28, 62, 41, 55, 47],
  monthly: [
    { label: "ינו'", count: 320 },
    { label: "פבר'", count: 480 },
    { label: "מרץ", count: 410 },
    { label: "אפר'", count: 620 },
    { label: "מאי", count: 710 },
    { label: "יוני", count: 847 },
  ],
  metrics: { botAnsweredPct: 94, handoffPct: 6 },
};

// Real users start from a clean zeroed state (never the demo numbers above)
// until the API responds. Prevents fake data flashing in production.
const ZERO_ANALYTICS: Analytics = {
  messagesToday: 0, openConversations: 0, closedThisMonth: 0, activeBots: 0,
  totalBots: 0, plan: "basic", quota: 0, botLimit: 0, messagesThisMonth: 0,
  packBalance: 0, weekly: [0, 0, 0, 0, 0, 0, 0], monthly: [],
  metrics: { botAnsweredPct: 0, handoffPct: 0 },
};

interface ConvRow {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  preview?: string;
  time?: string;
  bots?: { name?: string; bot_name?: string; whatsapp_number?: string } | null;
}

const DEMO_CONVS: ConvRow[] = [
  { id: "d1", customer_name: "רחל לוי", customer_phone: "052-1234567", status: "human", preview: "יש לך מקום לשישי בבוקר?", time: "09:41", bots: { name: "מספרת מיטל" } },
  { id: "d2", customer_name: "משה כהן", customer_phone: "050-2222222", status: "human", preview: "אפשר לדחות את התור?", time: "08:22", bots: { name: "מספרת מיטל" } },
  { id: "d3", customer_name: "שרה אברהם", customer_phone: "054-3333333", status: "human", preview: "כמה עולה צביעה שלמה?", time: "אתמול", bots: { name: "מספרת מיטל" } },
];

type PageId =
  | "overview" | "bots" | "inbox" | "history" | "analytics"
  | "templates" | "billing" | "store" | "account" | "support";

export default function DashboardPage() {
  const router = useRouter();
  const { toast, ToastHost } = useToast();

  const [page, setPage] = useState<PageId>("overview");
  const [sbOpen, setSbOpen] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(true);

  const [bots, setBots] = useState<Partial<Bot>[]>(DEMO_MODE ? DEMO_BOTS : []);
  const [analytics, setAnalytics] = useState<Analytics>(DEMO_MODE ? DEMO_ANALYTICS : ZERO_ANALYTICS);
  const [convs, setConvs] = useState<ConvRow[]>(DEMO_MODE ? DEMO_CONVS : []);
  const [user, setUser] = useState(DEMO_MODE ? { name: "דני כהן", email: "dani@gmail.com" } : { name: "", email: "" });

  // editor
  const [editBot, setEditBot] = useState<Partial<Bot> | null>(null);
  const [editorTab, setEditorTab] = useState<"info" | "faq" | "connect">("info");

  // store / inbox / history
  const [storeTab, setStoreTab] = useState<"plans" | "packs">("plans");
  const [planAnnual, setPlanAnnual] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(DEMO_MODE ? DEMO_CONVS[0].id : null);
  const [histFilter, setHistFilter] = useState("הכל");

  const loadData = useCallback(async () => {
    try {
      const [aRes, bRes, cRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/bots"),
        fetch("/api/conversations?status=human"),
      ]);
      if (aRes.ok && bRes.ok) {
        const a = await aRes.json();
        const b = await bRes.json();
        setAnalytics(a);
        setBots(b.bots?.length ? b.bots : []);
        setHasActiveSubscription(a.subscriptionStatus === "active");
        if (cRes.ok) {
          const cc = await cRes.json();
          setConvs(cc.conversations ?? []);
          setActiveConvId(cc.conversations?.[0]?.id ?? null);
        }
      } else if (!DEMO_MODE) {
        // Real deployment but the API failed — show a clean empty state, never
        // the demo numbers, so the user is not misled by fake data.
        setBots([]);
        setAnalytics(ZERO_ANALYTICS);
        setConvs([]);
        setActiveConvId(null);
        toast("טעינת הנתונים נכשלה. רענן את הדף ונסה שוב.");
      }
      // Load real user identity (name + email).
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          name: (authUser.user_metadata?.full_name as string) || authUser.email?.split("@")[0] || "",
          email: authUser.email || "",
        });
      }
    } catch {
      if (!DEMO_MODE) {
        // Network/parse failure in production — clear to empty, don't show demo.
        setBots([]);
        setAnalytics(ZERO_ANALYTICS);
        setConvs([]);
        setActiveConvId(null);
        toast("טעינת הנתונים נכשלה. בדוק את החיבור ונסה שוב.");
      }
      // Demo mode — keep the fallback data already in state.
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // #14 — when arriving from onboarding after creating a bot, open that bot's
  // WhatsApp connect step automatically (the hand-off is set in sessionStorage).
  useEffect(() => {
    if (!bots.length) return;
    let intent: { id?: string; tab?: string } | null = null;
    try {
      const raw = sessionStorage.getItem("rb_open_bot");
      if (raw) intent = JSON.parse(raw) as { id?: string; tab?: string };
    } catch {
      /* ignore */
    }
    if (!intent?.id) return;
    const bot = bots.find((b) => b.id === intent!.id);
    if (!bot) return;
    try {
      sessionStorage.removeItem("rb_open_bot");
    } catch {
      /* ignore */
    }
    setPage("bots");
    setEditBot({ ...bot });
    setEditorTab(intent.tab === "connect" ? "connect" : "info");
  }, [bots]);

  function goPage(id: PageId) {
    setPage(id);
    setSbOpen(false);
    setEditBot(null);
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  async function checkout(product: string) {
    toast("מעביר לסליקה מאובטחת...");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const d = await res.json();
      if (res.ok && d.url) {
        window.location.href = d.url;
      } else {
        toast(d.error || "הסליקה אינה זמינה כרגע");
      }
    } catch {
      toast("שגיאת חיבור לסליקה");
    }
  }

  function buyPack(product: string) {
    if (!hasActiveSubscription) {
      router.push("/onboarding");
      return;
    }
    checkout(product);
  }

  async function saveBot() {
    if (!editBot) return;
    if (!editBot.name?.trim()) {
      toast("נא להכניס שם");
      return;
    }
    // Demo mode has no real backend — keep the optimistic success.
    if (DEMO_MODE) {
      toast(`הבוט "${editBot.name}" נשמר בהצלחה`);
      setEditBot(null);
      return;
    }
    const isNew = !editBot.id || String(editBot.id).startsWith("demo");
    try {
      const res = await fetch(isNew ? "/api/bots" : `/api/bots/${editBot.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editBot),
      });
      if (res.ok) {
        toast(`הבוט "${editBot.name}" נשמר בהצלחה`);
        setEditBot(null);
        loadData();
        return;
      }
      // Real server error — do NOT claim success; keep the editor open.
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast(err.error || "השמירה נכשלה — נסה שוב");
    } catch {
      toast("השמירה נכשלה — בדוק את החיבור לאינטרנט");
    }
  }

  async function deleteBot() {
    if (!editBot?.id) return;
    if (!window.confirm(`למחוק לצמיתות את הבוט "${editBot.name || ""}"?\n\nפעולה זו אינה ניתנת לביטול.`)) {
      return;
    }
    if (DEMO_MODE || String(editBot.id).startsWith("demo")) {
      toast("הבוט נמחק");
      setEditBot(null);
      return;
    }
    try {
      const res = await fetch(`/api/bots/${editBot.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("הבוט נמחק");
        setEditBot(null);
        loadData();
        return;
      }
      toast("מחיקת הבוט נכשלה — נסה שוב");
    } catch {
      toast("מחיקת הבוט נכשלה — בדוק את החיבור");
    }
  }

  function copyRef() {
    navigator.clipboard?.writeText("https://robertbot.co.il/ref/dani-k");
    toast("הלינק הועתק");
  }

  const usagePct = analytics.quota
    ? Math.min(100, Math.round((analytics.messagesThisMonth / analytics.quota) * 100))
    : 0;
  const botPct = analytics.botLimit
    ? Math.min(100, Math.round((analytics.activeBots / analytics.botLimit) * 100))
    : 0;
  const weeklyMax = Math.max(...analytics.weekly, 1);
  const monthlyMax = Math.max(...analytics.monthly.map((m) => m.count), 1);

  const currentPlan: PlanId = isPlanId(analytics.plan) ? analytics.plan : "pro";
  function selectPlan(id: PlanId) {
    checkout(`${id}_${planAnnual ? "annual" : "monthly"}`);
  }

  const activeConv = convs.find((cv) => cv.id === activeConvId) ?? null;

  return (
    <div className={styles.dash}>
      <ToastHost />

      {/* SIDEBAR */}
      <aside className={c("sb") + (sbOpen ? " " + styles.open : "")}>
        <div className={c("sb-logo")}>
          <div className={c("sb-logo-mark")}><LogoMark /></div>
          <div className={c("sb-logo-name")}>Robert<span>.</span></div>
        </div>
        <div className={c("sb-scroll")}>
          <div className={c("sb-group")}>
            <div className={c("sb-item")} style={{ marginBottom: 4 }} onClick={() => router.push("/")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              דף הבית
            </div>
          </div>
          <div className={c("sb-group")}>
            <div className={c("sb-group-label")}>סקירה</div>
            <div className={c("sb-item") + (page === "overview" ? " " + styles.act : "")} onClick={() => goPage("overview")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              סקירה כללית
            </div>
          </div>
          <div className={c("sb-group")}>
            <div className={c("sb-group-label")}>בוטים</div>
            <div className={c("sb-item") + (page === "bots" ? " " + styles.act : "")} onClick={() => goPage("bots")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M12 11V7" /><circle cx="12" cy="5" r="2" /><path d="M8 15h.01M12 15h.01M16 15h.01" /></svg>
              הבוטים שלי
            </div>
            <div className={c("sb-item") + (page === "inbox" ? " " + styles.act : "")} onClick={() => goPage("inbox")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Inbox
              {convs.length > 0 && <span className={c("sb-badge")}>{convs.length}</span>}
            </div>
            <div className={c("sb-item") + (page === "history" ? " " + styles.act : "")} onClick={() => goPage("history")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8M8 8h5M8 16h3" /></svg>
              היסטוריית שיחות
            </div>
            <div className={c("sb-item") + (page === "analytics" ? " " + styles.act : "")} onClick={() => goPage("analytics")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              אנליטיקס
            </div>
            <div className={c("sb-item") + (page === "templates" ? " " + styles.act : "")} onClick={() => goPage("templates")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              תבניות מוכנות
              <span className={c("sb-new")}>חדש</span>
            </div>
          </div>
          <div className={c("sb-group")}>
            <div className={c("sb-group-label")}>חשבון</div>
            <div className={c("sb-item") + (page === "billing" ? " " + styles.act : "")} onClick={() => goPage("billing")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>
              מנוי וחיוב
            </div>
            <div className={c("sb-item") + (page === "store" ? " " + styles.act : "")} onClick={() => goPage("store")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
              מחירון וחנות
            </div>
            <div className={c("sb-item") + (page === "account" ? " " + styles.act : "")} onClick={() => goPage("account")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              הגדרות חשבון
            </div>
            <div className={c("sb-item") + (page === "support" ? " " + styles.act : "")} onClick={() => goPage("support")}>
              <svg className={c("sb-icon")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
              תמיכה
            </div>
          </div>
        </div>
        <div className={c("sb-footer")}>
          <div className={c("sb-user")} onClick={logout} title="התנתק">
            <div className={c("sb-av")}>{(user.name || user.email || "?")[0].toUpperCase()}</div>
            <div>
              <div className={c("sb-uname")}>{user.name || user.email || "המשתמש"}</div>
              <div className={c("sb-uplan")}>{isPlanId(analytics.plan) ? planLabelHe(analytics.plan) : "בסיסי"} · התנתק</div>
            </div>
          </div>
        </div>
      </aside>

      <main className={c("main")}>
        <div className={c("sb-overlay") + (sbOpen ? " " + styles.show : "")} onClick={() => setSbOpen(false)}></div>

        <div className={c("topbar")}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className={c("hamburger-btn")} onClick={() => setSbOpen((o) => !o)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className={c("tb-logo")}>
              <div className={c("tb-logo-mark")}><LogoMark /></div>
              <span className={c("tb-logo-name")}>Robert<em>.</em></span>
            </div>
          </div>
          <div className={c("tb-right")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={c("tb-notif")} onClick={() => toast("אין התראות חדשות")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                <div className={c("tb-notif-dot")}></div>
              </div>
              <button className={c("btn btn-sm")} onClick={() => goPage("store")} style={{ background: "linear-gradient(135deg,#1c1f2e,#2d3350)", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                שדרג
              </button>
              <button className={c("btn btn-primary btn-sm")} onClick={() => router.push("/onboarding?new=1")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                בוט חדש
              </button>
            </div>
          </div>
        </div>

        <div className={c("content")}>
          {renderOverview()}
          {renderBots()}
          {renderInbox()}
          {renderHistory()}
          {renderAnalytics()}
          {renderTemplates()}
          {renderBilling()}
          {renderStore()}
          {renderAccount()}
          {renderSupport()}
        </div>
      </main>
    </div>
  );

  // ───────────────────────────── render helpers ─────────────────────────────

  function pageCls(id: PageId) {
    return c("page") + (page === id ? " " + styles.act : "");
  }

  function renderOverview() {
    return (
      <div className={pageCls("overview")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>שלום, {user.name || "אורח"}</div><div className={c("ph-sub")}>הנה מה שקורה אצלך היום</div></div></div>
        <div className={c("grid-4")} style={{ marginBottom: 16 }}>
          <div className={c("card sc")}>
            <div className={c("sc-label")}>הודעות היום</div>
            <div className={c("sc-val")}>{analytics.messagesToday}</div>
            <div className={c("sc-sub up")}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg> 12% מאתמול</div>
          </div>
          <div className={c("card sc")}>
            <div className={c("sc-label")}>שיחות פתוחות</div>
            <div className={c("sc-val")}>{analytics.openConversations}</div>
            <div className={c("sc-sub dn")}>ממתינות לתגובה</div>
          </div>
          <div className={c("card sc")}>
            <div className={c("sc-label")}>שיחות שנסגרו</div>
            <div className={c("sc-val")}>{analytics.closedThisMonth}</div>
            <div className={c("sc-sub up")}>החודש</div>
          </div>
          <div className={c("card sc")}>
            <div className={c("sc-label")}>בוטים פעילים</div>
            <div className={c("sc-val")}>{analytics.activeBots}</div>
            <div className={c("sc-sub nt")}>מ-{analytics.botLimit} אפשריים</div>
          </div>
        </div>
        <div className={c("grid-2")}>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>הודעות השבוע</div>
            <div className={c("chart-bar-wrap")}>
              {analytics.weekly.map((v, i) => (
                <div key={i} className={c("cbar")} style={{ height: (v / weeklyMax) * 100 + "%" }}></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"].map((d) => (
                <span key={d} style={{ fontSize: 9, color: "var(--t4)" }}>{d}</span>
              ))}
            </div>
          </div>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>שימוש במנוי</div>
            <div className={c("ubar-wrap")}>
              <div className={c("ubar-top")}><span>הודעות החודש</span><span>{analytics.messagesThisMonth.toLocaleString()} / {analytics.quota.toLocaleString()}</span></div>
              <div className={c("ubar")}><div className={c("ubar-fill")} style={{ width: usagePct + "%" }}></div></div>
            </div>
            <div className={c("ubar-wrap")}>
              <div className={c("ubar-top")}><span>בוטים פעילים</span><span>{analytics.activeBots} / {analytics.botLimit}</span></div>
              <div className={c("ubar")}><div className={c("ubar-fill")} style={{ width: botPct + "%" }}></div></div>
            </div>
            <div className={c("divd")}></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--t3)" }}>מסלול מקצועי · חידוש 1.7.26</span>
              <button className={c("btn btn-outline btn-xs")} onClick={() => goPage("billing")}>שדרג</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderBots() {
    return (
      <div className={pageCls("bots")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>הבוטים שלי</div><div className={c("ph-sub")}>ניהול ועריכת הבוטים שלך</div></div></div>
        <div className={c("bots-grid")}>
          {bots.map((b, i) => {
            const col = BOT_COLORS[i % BOT_COLORS.length];
            return (
              <div key={b.id ?? i} className={c("bot-card") + (editBot?.id === b.id ? " " + styles.sel : "")} onClick={() => { setEditBot({ ...b }); setEditorTab("info"); }}>
                <div className={c("bc-top")}>
                  <div className={c("bc-icon")} style={{ background: col.bg, color: col.color }}>{(b.name ?? "?").charAt(0)}</div>
                  <span className={c("badge") + " " + (b.active ? c("badge-green") : c("badge-gray"))}>
                    <span className={c("sdot") + " " + (b.active ? c("sdot-on") : c("sdot-off"))}></span>{b.active ? "פעיל" : "כבוי"}
                  </span>
                </div>
                <div className={c("bc-name")}>{b.name}</div>
                <div className={c("bc-desc")}>{b.description || "—"}</div>
                <div className={c("bc-foot")}>
                  <span className={c("bc-phone")}>{b.whatsapp_number || "לא מחובר"}</span>
                </div>
              </div>
            );
          })}
          <div className={c("add-card")} onClick={() => router.push("/onboarding?new=1")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
            <span>הוסף בוט חדש</span>
          </div>
        </div>

        {editBot && (
          <div className={c("editor") + " " + styles.open}>
            <div className={c("ed-hdr")}>
              <div className={c("ed-title")}>עריכת בוט — {editBot.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className={c("ed-tabs")}>
                  <button className={c("etab") + (editorTab === "info" ? " " + styles.act : "")} onClick={() => setEditorTab("info")}>פרטים</button>
                  <button className={c("etab") + (editorTab === "faq" ? " " + styles.act : "")} onClick={() => setEditorTab("faq")}>שאלות נפוצות</button>
                  <button className={c("etab") + (editorTab === "connect" ? " " + styles.act : "")} onClick={() => setEditorTab("connect")}>חיבור וואטסאפ</button>
                </div>
                <button className={c("ed-close")} onClick={() => setEditBot(null)}>✕</button>
              </div>
            </div>
            <div className={c("ed-body")}>
              {editorTab === "info" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <div className={c("form-row2")}>
                    <div className={c("fg")}><label className={c("fl")}>שם העסק</label><input className={c("fi")} value={editBot.name ?? ""} onChange={(e) => setEditBot({ ...editBot, name: e.target.value })} /></div>
                    <div className={c("fg")}><label className={c("fl")}>סגנון דיבור</label>
                      <select className={c("fs")} value={editBot.style ?? "friendly"} onChange={(e) => setEditBot({ ...editBot, style: e.target.value as Bot["style"] })}>
                        <option value="friendly">חברותי ונעים</option>
                        <option value="professional">מקצועי ורשמי</option>
                        <option value="short">קצר ולעניין</option>
                      </select>
                    </div>
                  </div>
                  <div className={c("form-row2")}>
                    <div className={c("fg")}>
                      <label className={c("fl")}>שם הבוט</label>
                      <input className={c("fi")} value={editBot.bot_name ?? ""} placeholder="למשל: מיטל, נציג, העוזר שלי..." onChange={(e) => setEditBot({ ...editBot, bot_name: e.target.value })} />
                      <span className={c("fhint")}>השם שלקוחות הקצה רואים בוואטסאפ — שונה מבוט לבוט</span>
                    </div>
                    <div className={c("fg")}>
                      <label className={c("fl")}>תצוגה מקדימה</label>
                      <div style={{ background: "#075e54", borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(editBot.bot_name || "ב").charAt(0)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{editBot.bot_name || "הבוט"}</div>
                      </div>
                    </div>
                  </div>
                  <div className={c("fg")}><label className={c("fl")}>תיאור העסק והשירות</label><textarea className={c("fta")} value={editBot.description ?? ""} onChange={(e) => setEditBot({ ...editBot, description: e.target.value })} /><span className={c("fhint")}>Robert משתמש בתיאור זה כדי לענות ללקוחות</span></div>
                  <div className={c("trow")}><div className={c("tinfo")}><h4>הבוט פעיל</h4><p>כיבוי זמני ללא מחיקה</p></div><label className={c("tog")}><input type="checkbox" checked={!!editBot.active} onChange={(e) => setEditBot({ ...editBot, active: e.target.checked })} /><span className={c("tog-sl")}></span></label></div>
                </div>
              )}
              {editorTab === "faq" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 14 }}>הוסף שאלות שלקוחות שואלים לעתים קרובות — Robert יענה עליהן אוטומטית.</p>
                  <div>
                    {(editBot.faq ?? []).map((f, i) => (
                      <div className={c("faq-row")} key={i}>
                        <div className={c("faq-fields")}>
                          <input className={c("faq-q")} value={f.question} placeholder="שאלה (למשל: מה שעות הפעילות?)" onChange={(e) => { const faq = [...(editBot.faq ?? [])]; faq[i] = { ...faq[i], question: e.target.value }; setEditBot({ ...editBot, faq }); }} />
                          <input className={c("faq-a")} value={f.answer} placeholder="תשובה (מה שהבוט יענה ללקוח)" onChange={(e) => { const faq = [...(editBot.faq ?? [])]; faq[i] = { ...faq[i], answer: e.target.value }; setEditBot({ ...editBot, faq }); }} />
                        </div>
                        <button type="button" className={c("faq-del")} title="מחק שאלה" aria-label="מחק שאלה" onClick={() => { if (window.confirm("למחוק את השאלה הזו?")) setEditBot({ ...editBot, faq: (editBot.faq ?? []).filter((_, j) => j !== i) }); }}>🗑</button>
                      </div>
                    ))}
                  </div>
                  <button className={c("btn btn-outline btn-sm")} style={{ marginTop: 4 }} onClick={() => setEditBot({ ...editBot, faq: [...(editBot.faq ?? []), { question: "", answer: "" }] })}>+ הוסף שאלה</button>
                </div>
              )}
              {editorTab === "connect" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <div className={c("conn-box")}>
                    <div className={c("conn-row")}>
                      <div className={c("conn-ic") + " " + (editBot.whatsapp_number ? c("conn-ic-on") : c("conn-ic-off"))}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={editBot.whatsapp_number ? "var(--green-d)" : "var(--t4)"} strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div><div style={{ fontSize: 14, fontWeight: 700 }}>{editBot.whatsapp_number ? `מחובר — ${editBot.whatsapp_number}` : "לא מחובר"}</div><div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{editBot.whatsapp_number ? "הבוט פעיל ועונה על הודעות" : "חבר מספר כדי להפעיל"}</div></div>
                    </div>
                    {editBot.whatsapp_number && <button className={c("btn btn-outline btn-sm")} onClick={() => setEditBot({ ...editBot, whatsapp_number: null, active: false })}>נתק מספר</button>}
                  </div>
                  {!editBot.whatsapp_number && editBot.id && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)", marginBottom: 10 }}>חיבור אוטומטי (מומלץ)</p>
                      <ConnectWhatsApp
                        botId={editBot.id}
                        onConnected={(b) => setEditBot({ ...editBot, whatsapp_number: b.whatsapp_number ?? null, active: true })}
                      />
                    </div>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)", marginBottom: 10 }}>חיבור מספר ידני</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className={c("fi")} placeholder="05X-XXXXXXX" style={{ flex: 1 }} onChange={(e) => setEditBot({ ...editBot, whatsapp_number: e.target.value })} value={editBot.whatsapp_number ?? ""} />
                      <button className={c("btn btn-primary btn-sm")} onClick={() => toast("נשלח קוד אימות")}>חבר</button>
                    </div>
                  </div>
                </div>
              )}
              <div className={c("ed-actions")}>
                <button className={c("btn btn-danger btn-sm")} onClick={deleteBot}>מחק בוט</button>
                <button className={c("btn btn-outline btn-sm")} onClick={() => setEditBot(null)}>ביטול</button>
                <button className={c("btn btn-primary btn-sm")} onClick={saveBot}>שמור שינויים</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderInbox() {
    return (
      <div className={pageCls("inbox")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>Inbox</div><div className={c("ph-sub")}>שיחות הממתינות למענה אנושי</div></div></div>
        <div className={c("inbox-wrap")}>
          <div className={c("inbox-list")}>
            <div className={c("inbox-search")}><input placeholder="חיפוש שיחה..." /></div>
            <div className={c("conv-list")}>
              {convs.length === 0 && <div style={{ padding: 16, fontSize: 13, color: "var(--t4)" }}>אין שיחות ממתינות 🎉</div>}
              {convs.map((cv, i) => {
                const col = BOT_COLORS[i % BOT_COLORS.length];
                return (
                  <div key={cv.id} className={c("conv-item") + (activeConvId === cv.id ? " " + styles.act : "")} onClick={() => setActiveConvId(cv.id)}>
                    <div className={c("conv-av")} style={{ background: col.bg, color: col.color }}>{(cv.customer_name ?? "?").charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={c("conv-name")}>{cv.customer_name ?? cv.customer_phone}</div>
                      <div className={c("conv-prev")}>{cv.preview ?? cv.customer_phone}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div className={c("conv-time")}>{cv.time ?? ""}</div>
                      {activeConvId !== cv.id && <div className={c("conv-unread")}></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={c("chat-wrap")}>
            <div className={c("chat-hdr")}>
              <div><div style={{ fontSize: 14, fontWeight: 700 }}>{activeConv?.customer_name ?? "—"}</div><div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>{activeConv?.bots?.name ?? "מספרת מיטל"} · {activeConv?.customer_phone ?? ""}</div></div>
              <span className={c("badge badge-amber")}>מענה אנושי</span>
            </div>
            <div className={c("chat-msgs")}>
              <div className={c("bubble bin")}>{activeConv?.preview ?? "יש לך מקום פנוי ביום שישי בבוקר?"}<div className={c("bt")}>09:38</div></div>
              <div className={c("bubble bagent")}>היי! ביום שישי יש מקומות ב-09:00 וב-11:00. מה מתאים לך?<div className={c("bt")}>09:38 · Robert</div></div>
            </div>
            <div className={c("chat-input")}>
              <input placeholder="כתוב תגובה..." id="reply-input" onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} />
              <button className={c("btn btn-primary btn-sm")} onClick={sendReply}>שלח</button>
              <button className={c("btn btn-outline btn-sm")} onClick={returnToBot}>החזר ל-Robert</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderHistory() {
    const rows = [
      ["רחל לוי", "מספרת מיטל", "קביעת תור לשישי", "היום 09:41", "amber", "הועבר לאדם"],
      ["יוסי גולן", "גריל הבשרים", "הזמנת שולחן ל-6", "היום 08:15", "green", "הושלם"],
      ["דינה ברק", "מספרת מיטל", "שאלה על מחיר צביעה", "אתמול 18:30", "green", "הושלם"],
      ["אמיר כץ", "גריל הבשרים", "שאלות על התפריט", "אתמול 14:12", "green", "הושלם"],
      ["מיכל שמיר", "מספרת מיטל", "ביטול תור", "אתמול 11:05", "red", "בוטל"],
    ];
    return (
      <div className={pageCls("history")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>היסטוריית שיחות</div><div className={c("ph-sub")}>כל השיחות שהבוטים שלך ניהלו</div></div></div>
        <div className={c("hist-filters")}>
          {["הכל", "הושלם ע\"י בוט", "הועבר לאדם", "מספרת מיטל", "גריל הבשרים"].map((f) => (
            <button key={f} className={c("hf-pill") + (histFilter === f ? " " + styles.act : "")} onClick={() => setHistFilter(f)}>{f}</button>
          ))}
        </div>
        <div className={c("card")}>
          <table className={c("tbl")}>
            <thead><tr><th>שם לקוח</th><th>בוט</th><th>נושא</th><th>תאריך</th><th>סטטוס</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td>
                  <td><span className={c("badge badge-" + r[4])}>{r[5]}</span></td>
                  <td><button className={c("btn btn-ghost btn-xs")} onClick={() => { goPage("inbox"); }}>צפה</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    return (
      <div className={pageCls("analytics")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>אנליטיקס</div><div className={c("ph-sub")}>ביצועי הבוטים שלך לאורך זמן</div></div></div>
        <div className={c("grid-4")} style={{ marginBottom: 16 }}>
          <div className={c("card sc")}><div className={c("sc-label")}>הודעות החודש</div><div className={c("sc-val")}>{analytics.messagesThisMonth.toLocaleString()}</div><div className={c("sc-sub up")}>↑ פעילות החודש</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>שיחות שהושלמו</div><div className={c("sc-val")}>{analytics.closedThisMonth}</div><div className={c("sc-sub up")}>{analytics.metrics.botAnsweredPct}% ע&quot;י הבוט</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>זמן תגובה ממוצע</div><div className={c("sc-val")}>3שנ&apos;</div><div className={c("sc-sub up")}>מהיר מאוד</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>שביעות רצון</div><div className={c("sc-val")}>4.8</div><div className={c("sc-sub up")}>מתוך 5</div></div>
        </div>
        <div className={c("analytics-grid")}>
          <div className={c("analytics-card")}>
            <div className={c("card-title")}>הודעות לפי חודש</div>
            <div className={c("chart-line-wrap")}>
              {analytics.monthly.map((m, i) => (
                <div key={i} className={c("cl-bar")} style={{ height: (m.count / monthlyMax) * 100 + "%" }}></div>
              ))}
            </div>
            <div className={c("cl-labels")}>
              {analytics.monthly.map((m, i) => <span key={i} className={c("cl-label")}>{m.label}</span>)}
            </div>
          </div>
          <div className={c("analytics-card")}>
            <div className={c("card-title")}>פירוט ביצועים</div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שאלות שנענו ע&quot;י בוט</span><span className={c("metric-val")}>{analytics.metrics.botAnsweredPct}%</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שיחות שהועברו לאדם</span><span className={c("metric-val")}>{analytics.metrics.handoffPct}%</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>ממוצע הודעות לשיחה</span><span className={c("metric-val")}>6.8</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שיא שיחות ביום</span><span className={c("metric-val")}>43</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שעת שיא</span><span className={c("metric-val")}>10:00–12:00</span></div>
          </div>
        </div>
      </div>
    );
  }

  function renderTemplates() {
    const tmpls = [
      ["יופי ובריאות", "מספרה / קוסמטיקאית", "תורים, מחירים, שאלות נפוצות. מותאם לסלוני יופי."],
      ["מסעדנות", "מסעדה / קפה", "תפריט, שעות, הזמנת שולחן, עמדות חנייה."],
      ["שירותים מקצועיים", "יועץ / עורך דין / רואה חשבון", "קביעת פגישות, שאלות נפוצות, הכוונה ראשונית."],
      ["קמעונאות", "חנות / אתר מכירות", "שאלות על מוצרים, מדיניות החזרה, מעקב הזמנה."],
      ["רפואה", "מרפאה / קליניקה", "קביעת תורים, שאלות על שירותים, הכנה לביקור."],
      ["נדל\"ן", "סוכן נדל\"ן", "פרטים על נכסים, קביעת סיורים, מידע על שכונות."],
    ];
    return (
      <div className={pageCls("templates")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>תבניות מוכנות</div><div className={c("ph-sub")}>בחר תבנית ותפעיל בוט תוך דקות</div></div></div>
        <div className={c("tmpl-grid")}>
          {tmpls.map((t, i) => (
            <div key={i} className={c("tmpl-card")}>
              <div className={c("tmpl-tag")}>{t[0]}</div>
              <div className={c("tmpl-name")}>{t[1]}</div>
              <div className={c("tmpl-desc")}>{t[2]}</div>
              <button className={c("btn btn-primary btn-sm")} onClick={() => router.push("/onboarding?new=1")}>השתמש בתבנית</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderBilling() {
    return (
      <div className={pageCls("billing")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>מנוי וחיוב</div><div className={c("ph-sub")}>ניהול המנוי, שינוי מסלול ותשלומים</div></div></div>
        <div className={c("grid-2")}>
          <div>
            <div className={c("card card-pad")} style={{ marginBottom: 16 }}>
              <div className={c("card-title")}>המסלול הנוכחי</div>
              <div className={c("plan-box")}>
                <div className={c("plan-box-name")}>מסלול מקצועי</div>
                <div className={c("plan-box-price")}>₪199<sub>/חודש</sub></div>
                <div className={c("plan-box-renew")}>חידוש אוטומטי · 1 ביולי 2026</div>
              </div>
              <div className={c("ubar-wrap")}><div className={c("ubar-top")}><span>הודעות החודש</span><span style={{ fontWeight: 600 }}>{analytics.messagesThisMonth.toLocaleString()} / {analytics.quota.toLocaleString()}</span></div><div className={c("ubar")}><div className={c("ubar-fill")} style={{ width: usagePct + "%" }}></div></div></div>
              <div className={c("ubar-wrap")}><div className={c("ubar-top")}><span>בוטים פעילים</span><span style={{ fontWeight: 600 }}>{analytics.activeBots} / {analytics.botLimit}</span></div><div className={c("ubar")}><div className={c("ubar-fill")} style={{ width: botPct + "%" }}></div></div></div>
            </div>
            <div className={c("card card-pad")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div className={c("card-title")} style={{ marginBottom: 0 }}>שינוי מסלול</div>
                <button className={c("btn btn-outline btn-xs")} onClick={() => setPlanAnnual((v) => !v)}>
                  {planAnnual ? "הצג חיוב חודשי" : "הצג חיוב שנתי (−20%)"}
                </button>
              </div>
              <PricingPlans annual={planAnnual} onSelect={selectPlan} currentPlan={currentPlan} hideTrialLine />
            </div>
          </div>
          <div>
            <div className={c("card card-pad")} style={{ marginBottom: 16 }}>
              <div className={c("card-title")}>פרטי תשלום</div>
              <div className={c("cc-row")}>
                <div className={c("cc-icon")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg></div>
                <div className={c("cc-info")}><div className={c("cc-num")}>ויזה •••• 4242</div><div className={c("cc-exp")}>פג תוקף 12/27</div></div>
                <button className={c("btn btn-outline btn-xs")} onClick={billingPortal}>עדכן</button>
              </div>
              <div className={c("card-title")} style={{ marginTop: 16 }}>חשבוניות</div>
              <table className={c("tbl")}>
                <thead><tr><th>תאריך</th><th>סכום</th><th>סטטוס</th><th></th></tr></thead>
                <tbody>
                  {["יוני 2026", "מאי 2026", "אפריל 2026"].map((m) => (
                    <tr key={m}><td>{m}</td><td style={{ fontWeight: 600 }}>₪199</td><td><span className={c("badge badge-green")}>שולם</span></td><td><button className={c("btn btn-ghost btn-xs")} onClick={() => toast("החשבונית הורדה")}>הורד</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={c("settings-card")} style={{ marginBottom: 16 }}>
              <h3>📦 Packs — הודעות נוספות</h3>
              <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 14, lineHeight: 1.6 }}>נגמרו ההודעות שלך? קנה Pack — לא פוקע, עובר מחודש לחודש. המנוי מתנצל קודם, ה-Pack רק אחריו.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
                {[["Starter", "200 הודעות", "₪19", "pack_starter", false], ["Regular", "500 הודעות", "₪39", "pack_regular", true], ["Large", "1,000 הודעות", "₪69", "pack_large", false], ["XL", "3,000 הודעות", "₪179", "pack_xl", false]].map((p, i) => (
                  <div key={i} style={{ background: p[4] ? "#f0fdf4" : "var(--bg)", border: p[4] ? "1.5px solid var(--green)" : "1px solid var(--bdr)", borderRadius: 10, padding: 12, textAlign: "center", position: "relative" }}>
                    {p[4] === true && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 100, whiteSpace: "nowrap" }}>הכי נמכר</div>}
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{p[0]}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--t1)" }}>{p[1]}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--green-d)", margin: "4px 0" }}>{p[2]}</div>
                    <button className={c(p[4] ? "btn btn-primary btn-xs" : "btn btn-outline btn-xs")} style={{ width: "100%" }} onClick={() => buyPack(p[3] as string)}>קנה</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)", borderRadius: 10, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>מאגר Pack נוכחי</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>נותרו {analytics.packBalance} הודעות ב-Pack</div>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, color: "var(--t4)" }}>{analytics.packBalance}</span>
              </div>
            </div>

            <div className={c("ref-box")}>
              <div className={c("ref-title")}>חבר מביא חבר</div>
              <div className={c("ref-sub")}>שתף את הלינק האישי שלך — כל חבר שנרשם דרכך מקבל ₪50 קרדיט, וגם אתה מקבל ₪50.</div>
              <div className={c("ref-link-row")}>
                <input className={c("ref-link")} value="robert.bot/ref/dani-k" readOnly />
                <button className={c("btn btn-outline btn-sm")} onClick={copyRef}>העתק</button>
              </div>
              <div className={c("ref-stats")}>
                <div className={c("ref-stat")}><div className={c("ref-stat-n")}>3</div><div className={c("ref-stat-l")}>חברים הצטרפו</div></div>
                <div className={c("ref-stat")}><div className={c("ref-stat-n")}>₪150</div><div className={c("ref-stat-l")}>קרדיט שנצבר</div></div>
                <div className={c("ref-stat")}><div className={c("ref-stat-n")}>₪50</div><div className={c("ref-stat-l")}>זמין לשימוש</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStore() {
    return (
      <div className={pageCls("store")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>מחירון וחנות</div><div className={c("ph-sub")}>מסלולים, Packs ושדרוגים</div></div></div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          <button className={c("hf-pill") + (storeTab === "plans" ? " " + styles.act : "")} onClick={() => setStoreTab("plans")}>מסלולים</button>
          <button className={c("hf-pill") + (storeTab === "packs" ? " " + styles.act : "")} onClick={() => setStoreTab("packs")}>Packs — הודעות נוספות</button>
        </div>

        {storeTab === "plans" && (
          <div>
            <div style={{ background: "linear-gradient(135deg,#1c1f2e,#2d3350)", borderRadius: "var(--r-lg)", padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>המסלול שלך</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>מקצועי — ₪199/חודש</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>1,000 הודעות · 2 בוטים · חידוש 1.7.26</div>
              </div>
              <button className={c("btn btn-outline btn-sm")} style={{ color: "#fff", borderColor: "rgba(255,255,255,.3)" }} onClick={() => setPlanAnnual((v) => !v)}>
                {planAnnual ? "הצג חיוב חודשי" : "הצג חיוב שנתי (−20%)"}
              </button>
            </div>
            <PricingPlans annual={planAnnual} onSelect={selectPlan} currentPlan={currentPlan} hideTrialLine />
            <p style={{ fontSize: 12, color: "var(--t4)", textAlign: "center", marginTop: 8 }}>שינוי מסלול יכנס לתוקף בתחילת תקופת החיוב הבאה</p>
          </div>
        )}

        {storeTab === "packs" && (
          <div>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#92400e", lineHeight: 1.7 }}>
              <strong>כיצד Pack עובד:</strong> מכסת המנוי <strong>מנוצלת קודם</strong> בכל חודש. רק לאחר שנגמרה — הבוט צורך מה-Pack. ה-Pack <strong>לא פוקע</strong> ועובר לחודש הבא.
            </div>
            {!hasActiveSubscription && (
              <div style={{ background: "var(--red-pale)", border: "1px solid #fecaca", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "var(--red)", textAlign: "center" }}>
                רכישת Packs זמינה למנויים פעילים בלבד.{" "}
                <a href="/onboarding" style={{ color: "var(--red)", fontWeight: 700, textDecoration: "underline" }}>הירשם למנוי</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              {[["Starter", "200 הודעות", "₪19", "₪0.095 להודעה", "pack_starter", false], ["Regular", "500 הודעות", "₪39", "₪0.078 להודעה", "pack_regular", true], ["Large", "1,000 הודעות", "₪69", "₪0.069 להודעה", "pack_large", false], ["XL", "3,000 הודעות", "₪179", "₪0.060 להודעה", "pack_xl", false]].map((p, i) => (
                <div key={i} style={{ background: p[5] ? "#f0fdf4" : "var(--bg)", border: p[5] ? "2px solid var(--green)" : "1px solid var(--bdr)", borderRadius: "var(--r-lg)", padding: 16, textAlign: "center", position: "relative" }}>
                  {p[5] === true && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 100, whiteSpace: "nowrap" }}>הכי נמכר</div>}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{p[0]}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--t1)", marginBottom: 3 }}>{p[1]}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "var(--green-d)", letterSpacing: -1, marginBottom: 2 }}>{p[2]}</div>
                  <div style={{ fontSize: 11, color: "var(--t4)", marginBottom: 12 }}>{p[3]}</div>
                  <button className={c(p[5] ? "btn btn-primary btn-xs" : "btn btn-outline btn-xs")} style={{ width: "100%", opacity: hasActiveSubscription ? 1 : 0.4 }} disabled={!hasActiveSubscription} onClick={() => buyPack(p[4] as string)}>רכוש</button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--t4)", textAlign: "center", marginTop: 12 }}>כל הרכישות מאובטחות · Grow · חשבונית תישלח למייל</p>
          </div>
        )}
      </div>
    );
  }

  function renderAccount() {
    return (
      <div className={pageCls("account")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>הגדרות חשבון</div><div className={c("ph-sub")}>פרטים אישיים, אבטחה והתראות</div></div></div>
        <div className={c("grid-2")}>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>פרטים אישיים</div>
            <div className={c("fg")}><label className={c("fl")}>שם מלא</label><input className={c("fi")} defaultValue={user.name} autoComplete="name" /></div>
            <div className={c("fg")}><label className={c("fl")}>אימייל</label><input className={c("fi")} defaultValue={user.email} readOnly autoComplete="email" /></div>
            <div className={c("fg")}><label className={c("fl")}>טלפון</label><input className={c("fi")} defaultValue="" placeholder="הכנס מספר טלפון" autoComplete="tel" /></div>
            <button className={c("btn btn-primary btn-sm")} onClick={() => toast("הפרטים נשמרו")}>שמור שינויים</button>
          </div>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>התראות</div>
            <div className={c("trow")}><div className={c("tinfo")}><h4>התראה על שיחה שממתינה</h4><p>כשהבוט מעביר שיחה אליך</p></div><label className={c("tog")}><input type="checkbox" defaultChecked /><span className={c("tog-sl")}></span></label></div>
            <div className={c("trow")}><div className={c("tinfo")}><h4>סיכום יומי במייל</h4><p>הודעות, שיחות שנסגרו, ממתינות</p></div><label className={c("tog")}><input type="checkbox" defaultChecked /><span className={c("tog-sl")}></span></label></div>
            <div className={c("trow")}><div className={c("tinfo")}><h4>התראת חריגה בהודעות</h4><p>כשמגיעים ל-80% מהמכסה</p></div><label className={c("tog")}><input type="checkbox" /><span className={c("tog-sl")}></span></label></div>
          </div>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>אבטחה</div>
            <div className={c("fg")}><label className={c("fl")}>סיסמה נוכחית</label><input className={c("fi")} type="password" defaultValue="" placeholder="••••••••" /></div>
            <div className={c("fg")}><label className={c("fl")}>סיסמה חדשה</label><input className={c("fi")} type="password" placeholder="לפחות 8 תווים" /></div>
            <button className={c("btn btn-outline btn-sm")} onClick={() => toast("הסיסמה עודכנה")}>עדכן סיסמה</button>
          </div>
        </div>
      </div>
    );
  }

  function renderSupport() {
    return (
      <div className={pageCls("support")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>תמיכה</div><div className={c("ph-sub")}>מרכז עזרה ויצירת קשר</div></div></div>
        <div className={c("grid-2")} style={{ marginBottom: 16 }}>
          <div className={c("card sc")}><div className={c("sc-label")}>זמן תגובה ממוצע</div><div className={c("sc-val")}>שעתיים</div><div className={c("sc-sub up")}>זמין א&apos;-ו&apos;</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>גרסת מערכת</div><div className={c("sc-val")}>2.4.1</div><div className={c("sc-sub nt")}>עדכנית</div></div>
        </div>
        <div className={c("support-list")}>
          <div className={c("support-item")} onClick={() => toast("פותח את מרכז העזרה...")}>
            <div className={c("support-ic")} style={{ background: "var(--blue-pale)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg></div>
            <div><div className={c("support-title")}>מרכז עזרה</div><div className={c("support-sub")}>מדריכים, FAQ ותיעוד המוצר</div></div>
          </div>
          <div className={c("support-item")} onClick={() => toast("פותח צ'אט תמיכה...")}>
            <div className={c("support-ic")} style={{ background: "var(--green-pale)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
            <div><div className={c("support-title")}>צ&apos;אט עם התמיכה</div><div className={c("support-sub")}>תגובה בתוך שעתיים בימי עבודה</div></div>
          </div>
          <a className={c("support-item")} href="mailto:support@robertbot.co.il" style={{ textDecoration: "none" }}>
            <div className={c("support-ic")} style={{ background: "var(--amber-pale)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg></div>
            <div><div className={c("support-title")}>שלח מייל</div><div className={c("support-sub")}>support@robertbot.co.il</div></div>
          </a>
        </div>
      </div>
    );
  }

  // ── inbox actions
  async function sendReply() {
    const input = document.getElementById("reply-input") as HTMLInputElement | null;
    const text = input?.value.trim();
    if (!text || !activeConvId) return;
    if (input) input.value = "";
    if (!DEMO_MODE) {
      await fetch(`/api/conversations/${activeConvId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      }).catch(() => {});
    }
    toast("התגובה נשלחה");
  }

  async function returnToBot() {
    if (!activeConvId) return;
    if (!DEMO_MODE) {
      await fetch(`/api/conversations/${activeConvId}/return`, { method: "POST" }).catch(() => {});
    }
    setConvs((cs) => cs.filter((cv) => cv.id !== activeConvId));
    toast("השיחה הוחזרה ל-Robert");
  }

  async function billingPortal() {
    try {
      const res = await fetch("/api/billing/portal");
      const d = await res.json();
      if (res.ok && d.url) window.location.href = d.url;
      else toast(d.error || "פורטל החיוב אינו זמין כרגע");
    } catch {
      toast("שגיאת חיבור");
    }
  }
}
