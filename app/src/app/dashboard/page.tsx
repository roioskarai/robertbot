"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard.module.css";
import { scoped } from "@/lib/cx";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import ConnectWhatsApp from "@/components/ConnectWhatsApp";
import ManualConnectWizard from "@/components/ManualConnectWizard";
import ThemeToggle from "@/components/ThemeToggle";
import BillingTab from "@/components/dashboard/BillingTab";
import StoreTab from "@/components/dashboard/StoreTab";
import TrialBanner from "@/components/dashboard/TrialBanner";
import type { Bot, Service, WorkingHours } from "@/lib/types";
import { DAY_KEYS, DAYS_HE } from "@/app/onboarding/subcats";
import { planLabelHe, type PlanId } from "@/lib/plans";
import { deriveSubscriptionState, type SubscriptionState } from "@/lib/subscription";
import { isValidPhoneIL } from "@/lib/validation";
import type { BillingInfo } from "@/lib/payments/types";

const c = scoped(styles);

// True when no real Supabase backend is configured (placeholder/demo).
// Mirrors the server-side check in lib/agents/runner.ts so client actions
// know whether a real API exists — avoids fragile per-id "startsWith" guards.
const DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

type WaConnStatus = "disconnected" | "pending_verification" | "connected" | "error";

// Honest 4-state connection status. Falls back to deriving from
// whatsapp_number for bot rows read before migration 0014 adds the column.
function waConnStatus(bot: { whatsapp_number?: string | null; wa_connection_status?: WaConnStatus }): WaConnStatus {
  return bot.wa_connection_status ?? (bot.whatsapp_number ? "connected" : "disconnected");
}

const WA_STATUS_META: Record<WaConnStatus, { icon: string; cls: string; title: string }> = {
  connected: { icon: "🟢", cls: "conn-ic-on", title: "מחובר" },
  pending_verification: { icon: "🟡", cls: "conn-ic-pending", title: "מתחבר" },
  disconnected: { icon: "🔴", cls: "conn-ic-off", title: "לא מחובר" },
  error: { icon: "⚠️", cls: "conn-ic-error", title: "שגיאת חיבור" },
};

// ── demo fallback data (used when not signed in / no Supabase) ──
const DEMO_BOTS: Partial<Bot>[] = [
  {
    id: "demo-1",
    name: "מספרת מיטל",
    bot_name: "מיטל",
    business_subtype: "ספר / מספרה",
    description: "עונה על שאלות, קובע תורים ומסביר על השירותים",
    whatsapp_number: "050-1234567",
    active: true,
    style: "friendly",
    faq: [],
    services: [],
    created_at: "2026-05-02T09:00:00Z",
  },
  {
    id: "demo-2",
    name: "גריל הבשרים",
    bot_name: "גריל",
    business_subtype: "מסעדה",
    description: "תפריט, שעות פתיחה, הזמנת שולחן",
    whatsapp_number: "052-9876543",
    active: true,
    style: "friendly",
    faq: [],
    services: [],
    created_at: "2026-06-11T09:00:00Z",
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
  subscriptionEndsAt?: string | null;
  billingCycle?: string;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: string | null;
  isComp?: boolean;
  accountCreatedAt?: string | null;
  subscription: SubscriptionState;
  packBalance: number;
  perBot?: { botId: string; messagesThisMonth: number; conversations: number }[];
  weekly: number[];
  monthly: { label: string; count: number }[];
  metrics: {
    botAnsweredPct: number;
    handoffPct: number;
    activeCustomers?: number;
    avgMsgsPerConversation?: number;
    peakDayCount?: number;
    peakHourRange?: string | null;
  };
}

// Demo/zero placeholders derive their subscription like the real API does.
const DEMO_SUB = deriveSubscriptionState({
  plan: "pro", subscription_status: "active", billing_cycle: "monthly",
  subscription_ends_at: new Date(Date.now() + 30 * 86400e3).toISOString(),
});
const ZERO_SUB = deriveSubscriptionState({
  subscription_status: "trial",
  trial_ends_at: new Date(Date.now() + 7 * 86400e3).toISOString(),
});

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
  subscription: DEMO_SUB,
  packBalance: 0,
  perBot: [
    { botId: "demo-1", messagesThisMonth: 612, conversations: 38 },
    { botId: "demo-2", messagesThisMonth: 235, conversations: 14 },
  ],
  weekly: [32, 45, 28, 62, 41, 55, 47],
  monthly: [
    { label: "ינו'", count: 320 },
    { label: "פבר'", count: 480 },
    { label: "מרץ", count: 410 },
    { label: "אפר'", count: 620 },
    { label: "מאי", count: 710 },
    { label: "יוני", count: 847 },
  ],
  metrics: { botAnsweredPct: 94, handoffPct: 6, activeCustomers: 52, avgMsgsPerConversation: 6.8, peakDayCount: 43, peakHourRange: "10:00–12:00" },
};

// Real users start from a clean zeroed state (never the demo numbers above)
// until the API responds. Prevents fake data flashing in production.
const ZERO_ANALYTICS: Analytics = {
  messagesToday: 0, openConversations: 0, closedThisMonth: 0, activeBots: 0,
  totalBots: 0, plan: "basic", quota: 0, botLimit: 0, messagesThisMonth: 0,
  subscription: ZERO_SUB,
  packBalance: 0, perBot: [], weekly: [0, 0, 0, 0, 0, 0, 0], monthly: [],
  metrics: { botAnsweredPct: 0, handoffPct: 0 },
};

interface ConvRow {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  preview?: string;
  time?: string;
  last_message_at?: string | null;
  bots?: { name?: string; bot_name?: string; whatsapp_number?: string } | null;
}

const DEMO_CONVS: ConvRow[] = [
  { id: "d1", customer_name: "רחל לוי", customer_phone: "052-1234567", status: "human", preview: "יש לך מקום לשישי בבוקר?", time: "09:41", bots: { name: "מספרת מיטל" } },
  { id: "d2", customer_name: "משה כהן", customer_phone: "050-2222222", status: "human", preview: "אפשר לדחות את התור?", time: "08:22", bots: { name: "מספרת מיטל" } },
  { id: "d3", customer_name: "שרה אברהם", customer_phone: "054-3333333", status: "human", preview: "כמה עולה צביעה שלמה?", time: "אתמול", bots: { name: "מספרת מיטל" } },
];

interface ConvMessage {
  id: string;
  from_type: "customer" | "bot" | "human";
  body: string;
  created_at: string;
}

// Demo-mode chat thread — the same two bubbles the inbox mock used to
// hardcode, now properly gated on DEMO_MODE (real users never see them).
const demoThread = (convId: string): ConvMessage[] => [
  { id: convId + "-m1", from_type: "customer", body: "יש לך מקום פנוי ביום שישי בבוקר?", created_at: new Date().toISOString() },
  { id: convId + "-m2", from_type: "bot", body: "היי! ביום שישי יש מקומות ב-09:00 וב-11:00. מה מתאים לך?", created_at: new Date().toISOString() },
];

const DEMO_HISTORY: ConvRow[] = [
  { id: "h1", customer_name: "רחל לוי", customer_phone: "052-1234567", status: "human", last_message_at: new Date().toISOString(), bots: { name: "מספרת מיטל" } },
  { id: "h2", customer_name: "יוסי גולן", customer_phone: "050-7654321", status: "closed", last_message_at: new Date(Date.now() - 3600e3).toISOString(), bots: { name: "גריל הבשרים" } },
  { id: "h3", customer_name: "דינה ברק", customer_phone: "054-1112222", status: "bot", last_message_at: new Date(Date.now() - 86400e3).toISOString(), bots: { name: "מספרת מיטל" } },
  { id: "h4", customer_name: "אמיר כץ", customer_phone: "053-3334444", status: "bot", last_message_at: new Date(Date.now() - 90000e3).toISOString(), bots: { name: "גריל הבשרים" } },
];

type PageId =
  | "overview" | "bots" | "inbox" | "history" | "analytics"
  | "billing" | "store" | "account" | "support";

type EditorTab = "general" | "hours" | "services" | "faq" | "connect" | "knowledge" | "advanced";

const VALID_PAGES: PageId[] = ["overview", "bots", "inbox", "history", "analytics", "billing", "store", "account", "support"];
const VALID_TABS: EditorTab[] = ["general", "hours", "services", "faq", "connect", "knowledge", "advanced"];

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, ToastHost } = useToast();

  const [page, setPage] = useState<PageId>("overview");
  const [sbOpen, setSbOpen] = useState(false);

  const [bots, setBots] = useState<Partial<Bot>[]>(DEMO_MODE ? DEMO_BOTS : []);
  const [analytics, setAnalytics] = useState<Analytics>(DEMO_MODE ? DEMO_ANALYTICS : ZERO_ANALYTICS);
  const [convs, setConvs] = useState<ConvRow[]>(DEMO_MODE ? DEMO_CONVS : []);
  const [history, setHistory] = useState<ConvRow[]>(DEMO_MODE ? DEMO_HISTORY : []);
  const [user, setUser] = useState(DEMO_MODE ? { name: "דני כהן", email: "dani@gmail.com", phone: "" } : { name: "", email: "", phone: "" });
  const [accountForm, setAccountForm] = useState({ name: "", phone: "" });
  const [referral, setReferral] = useState<{ link: string; code: string; friends: number; earned: number; available: number } | null>(null);
  const [notifPrefs, setNotifPrefs] = useState({ waiting: true, daily: true, quota: false });
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [pwForm, setPwForm] = useState({ current: "", next: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // editor
  const [editBot, setEditBot] = useState<Partial<Bot> | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("general");

  // manual WhatsApp connection (Twilio OTP) inside the editor's "connect" tab
  const [manualPhone, setManualPhone] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualStep, setManualStep] = useState<"idle" | "sent" | "success">("idle");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualConfigIssue, setManualConfigIssue] = useState(false);
  // Whether the server can actually run the manual OTP flow (Twilio Verify
  // configured). Demo mode is always "available" — the connect route pretends.
  const [manualAvailable, setManualAvailable] = useState(true);
  // Reset the manual-connect flow whenever the edited bot changes / editor closes.
  useEffect(() => { setManualStep("idle"); setManualPhone(""); setManualCode(""); setManualError(null); setManualConfigIssue(false); }, [editBot?.id]);
  // Pre-detect a half-configured Twilio (creds without a Verify service) so we
  // show a friendly note instead of letting "שלח קוד" hit a 503.
  useEffect(() => {
    if (DEMO_MODE || editorTab !== "connect" || !editBot?.id) return;
    fetch("/api/whatsapp/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setManualAvailable(d.manualEnabled ?? true); })
      .catch(() => {}); // fail-open — the route itself returns a friendly 503
  }, [editorTab, editBot?.id]);

  // Lazily load real card + invoices the first time the billing tab is opened.
  useEffect(() => {
    if (page !== "billing" || billingInfo) return;
    if (DEMO_MODE) {
      setBillingInfo({
        supported: true,
        card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2027 },
        invoices: [
          { id: "d1", date: Math.floor(Date.now() / 1000), amount: 199, currency: "ils", status: "paid", url: null },
          { id: "d2", date: Math.floor(Date.now() / 1000) - 2592000, amount: 199, currency: "ils", status: "paid", url: null },
        ],
      });
      return;
    }
    fetch("/api/billing/invoices")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setBillingInfo(d); })
      .catch(() => {});
  }, [page, billingInfo]);

  // store / inbox / history
  const [storeTab, setStoreTab] = useState<"plans" | "packs">("plans");
  const [planAnnual, setPlanAnnual] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(DEMO_MODE ? DEMO_CONVS[0].id : null);
  const [convSearch, setConvSearch] = useState("");
  const [histFilter, setHistFilter] = useState("הכל");

  // Real per-conversation message thread (was a hardcoded mock — bug: demo
  // bubbles leaked to real users). Cached per conversation id.
  const [convMessages, setConvMessages] = useState<Record<string, ConvMessage[]>>({});
  const [convLoading, setConvLoading] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);

  const loadConvThread = useCallback((id: string, force = false) => {
    if (DEMO_MODE) {
      setConvMessages((m) => (m[id] ? m : { ...m, [id]: demoThread(id) }));
      return;
    }
    if (convMessages[id] && !force) return; // cached
    setConvLoading(true);
    setConvError(null);
    fetch(`/api/conversations/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((d) => setConvMessages((m) => ({ ...m, [id]: (d.messages ?? []) as ConvMessage[] })))
      .catch(() => setConvError("טעינת השיחה נכשלה — נסה שוב"))
      .finally(() => setConvLoading(false));
  }, [convMessages]);

  useEffect(() => {
    if (activeConvId) loadConvThread(activeConvId);
    else setConvError(null);
  }, [activeConvId, loadConvThread]);

  const loadData = useCallback(async () => {
    try {
      const [aRes, bRes, cRes, hRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/bots"),
        fetch("/api/conversations?status=human"),
        fetch("/api/conversations"),
      ]);
      if (aRes.ok && bRes.ok) {
        const a = await aRes.json();
        const b = await bRes.json();
        setAnalytics(a);
        setBots(b.bots?.length ? b.bots : []);
        if (cRes.ok) {
          const cc = await cRes.json();
          setConvs(cc.conversations ?? []);
          setActiveConvId(cc.conversations?.[0]?.id ?? null);
        }
        if (hRes.ok) {
          const hh = await hRes.json();
          setHistory(hh.conversations ?? []);
        }
      } else if (!DEMO_MODE) {
        // Real deployment but the API failed — show a clean empty state, never
        // the demo numbers, so the user is not misled by fake data.
        setBots([]);
        setAnalytics(ZERO_ANALYTICS);
        setConvs([]);
        setHistory([]);
        setActiveConvId(null);
        toast("טעינת הנתונים נכשלה. רענן את הדף ונסה שוב.");
      }
      // Load real user identity (name + email).
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const name = (authUser.user_metadata?.full_name as string) || authUser.email?.split("@")[0] || "";
        const phone = (authUser.user_metadata?.phone as string) || "";
        setUser({ name, email: authUser.email || "", phone });
        setAccountForm({ name, phone });
        const np = authUser.user_metadata?.notif_prefs as Partial<typeof notifPrefs> | undefined;
        if (np && typeof np === "object") {
          setNotifPrefs({ waiting: np.waiting ?? true, daily: np.daily ?? true, quota: np.quota ?? false });
        }
        // Real per-user referral link (deterministic from the user id — no DB
        // needed). Credit/friend tracking stays 0 until the referrals table ships.
        const refCode = authUser.id.replace(/-/g, "").slice(0, 8);
        const origin = typeof window !== "undefined" ? window.location.origin : "https://robertbot.co.il";
        setReferral({ link: `${origin}/?ref=${refCode}`, code: refCode, friends: 0, earned: 0, available: 0 });
      }
    } catch {
      if (!DEMO_MODE) {
        // Network/parse failure in production — clear to empty, don't show demo.
        setBots([]);
        setAnalytics(ZERO_ANALYTICS);
        setConvs([]);
        setHistory([]);
        setActiveConvId(null);
        toast("טעינת הנתונים נכשלה. בדוק את החיבור ונסה שוב.");
      }
      // Demo mode — keep the fallback data already in state.
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── URL ⇄ view state ──────────────────────────────────────────────────
  // The query string is the source of truth for which tab/editor is shown, so
  // browser Back/Forward, refresh, and shared deep-links all work. This effect
  // reconciles state to the URL (initial load, popstate, and the onboarding
  // hand-off ?page=bots&bot=<id>&tab=connect). Field edits to editBot don't
  // change the URL, so they never trigger or get reverted by this effect.
  const buildUrl = useCallback((next: { page?: PageId; bot?: string | null; tab?: EditorTab }) => {
    const sp = new URLSearchParams();
    if (next.page && next.page !== "overview") sp.set("page", next.page);
    if (next.bot) {
      sp.set("bot", next.bot);
      if (next.tab) sp.set("tab", next.tab);
    }
    const qs = sp.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }, []);

  useEffect(() => {
    const rawPage = searchParams.get("page");
    const nextPage: PageId = (VALID_PAGES as string[]).includes(rawPage ?? "") ? (rawPage as PageId) : "overview";
    setPage((p) => (p === nextPage ? p : nextPage));

    const botId = searchParams.get("bot");
    if (botId) {
      const rawTab = searchParams.get("tab");
      const nextTab: EditorTab = (VALID_TABS as string[]).includes(rawTab ?? "") ? (rawTab as EditorTab) : "general";
      setEditBot((cur) => {
        if (cur?.id === botId) return cur;                 // already open — keep the in-progress draft
        const bot = bots.find((b) => b.id === botId);
        return bot ? { ...bot } : cur;                     // open when found; ignore unknown id
      });
      setEditorTab(nextTab);
    } else {
      setEditBot((cur) => (cur ? null : cur));             // ?bot dropped → close the editor
    }
  }, [searchParams, bots]);

  function goPage(id: PageId) {
    setSbOpen(false);
    setEditBot(null);
    setPage(id);
    router.push(buildUrl({ page: id }));
  }

  // Open the bot editor on a given tab (also used for the onboarding deep-link).
  function openEditor(b: Partial<Bot>, tab: EditorTab) {
    setPage("bots");
    setEditBot({ ...b });
    setEditorTab(tab);
    if (b.id) router.push(buildUrl({ page: "bots", bot: b.id, tab }));
  }

  function closeEditor() {
    setEditBot(null);
    router.push(buildUrl({ page: "bots" }));
  }

  function changeEditorTab(tab: EditorTab) {
    setEditorTab(tab);
    if (editBot?.id) router.replace(buildUrl({ page: "bots", bot: editBot.id, tab }));
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
    // Packs require an active paid plan. Route the user to pick one in the
    // Store (they are already there) instead of bouncing to onboarding.
    if (!analytics.subscription.canPurchasePacks) {
      setStoreTab("plans");
      goPage("store");
      toast("לרכישת Pack צריך מסלול פעיל — בחר מסלול תחילה");
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
      closeEditor();
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
        closeEditor();
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
      closeEditor();
      return;
    }
    try {
      const res = await fetch(`/api/bots/${editBot.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("הבוט נמחק");
        closeEditor();
        loadData();
        return;
      }
      toast("מחיקת הבוט נכשלה — נסה שוב");
    } catch {
      toast("מחיקת הבוט נכשלה — בדוק את החיבור");
    }
  }

  // ── Manual WhatsApp connection (Twilio OTP) ──
  // manualStep drives a 3-badge guided wizard (1 מספר → 2 קוד → 3 הצלחה, #12).
  // Errors surface inline (manualError) next to the relevant field instead of
  // a transient toast, matching the signup-wizard pattern from #4/#6.
  async function sendManualCode() {
    if (!editBot?.id || manualBusy) return;
    setManualError(null);
    if (!isValidPhoneIL(manualPhone)) { setManualError("מספר טלפון לא תקין — הזן מספר וואטסאפ ישראלי תקין"); return; }
    if (DEMO_MODE) { setManualStep("sent"); setManualCode(""); toast("מצב הדגמה — הזן קוד כלשהו"); return; }
    setManualBusy(true);
    try {
      const res = await fetch(`/api/bots/${editBot.id}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: manualPhone.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setManualError(d.error || "שליחת הקוד נכשלה — נסה שוב"); setManualConfigIssue(!!d.configIssue); return; }
      setManualStep("sent");
      setManualCode("");
      setEditBot((eb) => (eb ? { ...eb, wa_connection_status: "pending_verification" } : eb));
      toast(d.demo ? "מצב הדגמה — הזן קוד כלשהו" : "קוד אימות נשלח לוואטסאפ של המספר");
    } catch {
      setManualError("אין חיבור לשרת — נסה שוב");
    } finally {
      setManualBusy(false);
    }
  }

  // "שלח קוד שוב" — resend to the same number without losing the step.
  function resendManualCode() {
    setManualCode("");
    sendManualCode();
  }

  // "החלף מספר" — back to step 1 with a clean slate.
  function changeManualNumber() {
    setManualStep("idle");
    setManualPhone("");
    setManualCode("");
    setManualError(null);
  }

  async function verifyManualCode() {
    if (!editBot?.id || manualBusy) return;
    setManualError(null);
    if (manualCode.trim().length < 4) { setManualError("הזן את הקוד שקיבלת"); return; }
    if (DEMO_MODE) {
      setEditBot((eb) => (eb ? { ...eb, whatsapp_number: manualPhone.trim(), active: true, wa_connection_status: "connected" } : eb));
      setManualStep("success");
      setManualCode("");
      return;
    }
    setManualBusy(true);
    try {
      const res = await fetch(`/api/bots/${editBot.id}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: manualPhone.trim(), code: manualCode.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setManualError(d.error || "אימות הקוד נכשל — בדוק את הקוד ונסה שוב"); setManualConfigIssue(!!d.configIssue); return; }
      setManualPhone(d.bot?.whatsapp_number ?? manualPhone.trim());
      setEditBot((eb) => (eb ? { ...eb, whatsapp_number: d.bot?.whatsapp_number ?? manualPhone.trim(), active: true, wa_connection_status: "connected" } : eb));
      setManualStep("success");
      setManualCode("");
      loadData();
    } catch {
      setManualError("אין חיבור לשרת — נסה שוב");
    } finally {
      setManualBusy(false);
    }
  }

  // "סגור" on the success screen — collapse back to the standard connected banner.
  function closeManualSuccess() {
    setManualStep("idle");
    setManualPhone("");
    setManualCode("");
    setManualError(null);
  }

  // Notification preferences — controlled toggles persisted to user_metadata.
  async function toggleNotif(key: "waiting" | "daily" | "quota") {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    if (DEMO_MODE) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { notif_prefs: next } });
      if (error) { setNotifPrefs(notifPrefs); toast("שמירת ההעדפה נכשלה"); }
    } catch {
      setNotifPrefs(notifPrefs);
      toast("אין חיבור לשרת — ההעדפה לא נשמרה");
    }
  }

  async function disconnectNumber() {
    if (!editBot) return;
    // Bot not persisted yet → just clear local state.
    if (!editBot.id || DEMO_MODE || String(editBot.id).startsWith("demo")) {
      setEditBot((eb) => (eb ? { ...eb, whatsapp_number: null, active: false, wa_connection_status: "disconnected" } : eb));
      toast(DEMO_MODE ? "המספר נותק (הדגמה)" : "המספר נותק");
      return;
    }
    if (manualBusy) return;
    setManualBusy(true);
    try {
      const res = await fetch(`/api/bots/${editBot.id}/disconnect`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast(d.error || "הניתוק נכשל"); return; }
      setEditBot((eb) => (eb ? { ...eb, whatsapp_number: null, active: false, wa_connection_status: "disconnected" } : eb));
      toast("המספר נותק");
      loadData();
    } catch {
      toast("אין חיבור לשרת — נסה שוב");
    } finally {
      setManualBusy(false);
    }
  }

  function copyRef() {
    if (referral?.link) navigator.clipboard?.writeText(referral.link);
    toast(referral?.link ? "הלינק הועתק" : "הלינק עדיין לא זמין");
  }

  const usagePct = analytics.quota
    ? Math.min(100, Math.round((analytics.messagesThisMonth / analytics.quota) * 100))
    : 0;
  const botPct = analytics.botLimit
    ? Math.min(100, Math.round((analytics.activeBots / analytics.botLimit) * 100))
    : 0;
  const weeklyMax = Math.max(...analytics.weekly, 1);
  const monthlyMax = Math.max(...analytics.monthly.map((m) => m.count), 1);

  // The single derived subscription state — every billing/plan surface reads
  // this, so a trial user never sees a paid plan+price as if they owned it.
  const sub = analytics.subscription;
  // Short label for the sidebar/overview footer (never a price).
  const planShortLabel =
    sub.status === "trial" ? "ניסיון חינם"
      : sub.status === "trial_expired" ? "הניסיון הסתיים"
        : sub.status === "cancelled" ? "אין מנוי"
          : planLabelHe(sub.plan);
  function selectPlan(id: PlanId) {
    checkout(`${id}_${planAnnual ? "annual" : "monthly"}`);
  }

  // ── bot editor field helpers ──
  const DEFAULT_DAY = { open: "09:00", close: "18:00", closed: false };
  function ensureHours(eb: Partial<Bot>): WorkingHours {
    if (eb.working_hours) return eb.working_hours;
    return Object.fromEntries(DAY_KEYS.map((k) => [k, { ...DEFAULT_DAY }])) as WorkingHours;
  }
  function updateBotHours(dayKey: (typeof DAY_KEYS)[number], patch: Partial<{ open: string; close: string; closed: boolean }>) {
    setEditBot((eb) => {
      if (!eb) return eb;
      const base = ensureHours(eb);
      return { ...eb, working_hours: { ...base, [dayKey]: { ...base[dayKey], ...patch } } };
    });
  }
  function updateService(i: number, patch: Partial<Service>) {
    setEditBot((eb) => {
      if (!eb) return eb;
      const services = [...(eb.services ?? [])];
      services[i] = { ...services[i], ...patch };
      return { ...eb, services };
    });
  }

  // The bot editor tabs — labels + which key. "connect"/"faq" keep their exact
  // labels so the connect-wizard e2e (tab "חיבור וואטסאפ") stays valid.
  const EDITOR_TABS: { key: EditorTab; label: string }[] = [
    { key: "general", label: "מידע כללי" },
    { key: "hours", label: "שעות פעילות" },
    { key: "services", label: "שירותים" },
    { key: "faq", label: "שאלות נפוצות" },
    { key: "connect", label: "חיבור וואטסאפ" },
    { key: "knowledge", label: "ידע והנחיות" },
    { key: "advanced", label: "מתקדם" },
  ];
  // Migration-0010 columns are only editable once the DB row actually carries
  // them (feature-detect on the loaded row) — otherwise hide with a hint.
  const editBotForDetect: Partial<Bot> = editBot ?? {};
  const extendedFields = "website" in editBotForDetect || "custom_instructions" in editBotForDetect;

  const activeConv = convs.find((cv) => cv.id === activeConvId) ?? null;

  return (
    <div className={styles.dash}>
      <ToastHost />

      {/* SIDEBAR */}
      <aside className={c("sb") + (sbOpen ? " " + styles.open : "")}>
        <Link href="/" className={c("sb-logo")} style={{ textDecoration: "none" }}>
          <div className={c("sb-logo-name")}>Robert<span>.</span></div>
        </Link>
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
              <div className={c("sb-uplan")}>{planShortLabel} · התנתק</div>
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
            <Link href="/" className={c("tb-logo")} style={{ textDecoration: "none" }}>
              <span className={c("tb-logo-name")}>Robert<em>.</em></span>
            </Link>
          </div>
          <div className={c("tb-right")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ThemeToggle />
              <div className={c("tb-notif")} onClick={() => toast("אין התראות חדשות")} title="התראות">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
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
          {/* Persistent across every dashboard view — trial countdown / locked-state nudge. */}
          <TrialBanner sub={sub} onChoosePlan={() => goPage("store")} />
          {renderOverview()}
          {renderBots()}
          {renderInbox()}
          {renderHistory()}
          {renderAnalytics()}
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
        <div className={c("ph")}><div><div className={c("ph-title")}>{user.name ? `שלום, ${user.name}` : "שלום"}</div><div className={c("ph-sub")}>הנה מה שקורה אצלך היום</div></div></div>
        <div className={c("grid-4")} style={{ marginBottom: 16 }}>
          <div className={c("card sc")}>
            <div className={c("sc-label")}>הודעות היום</div>
            <div className={c("sc-val")}>{analytics.messagesToday}</div>
            <div className={c("sc-sub nt")}>{analytics.messagesToday === 0 ? "אין הודעות היום עדיין" : "הודעות נכנסו היום"}</div>
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
              <span style={{ fontSize: 13, color: "var(--t3)" }}>{planShortLabel}</span>
              <button className={c("btn btn-outline btn-xs")} onClick={() => goPage("store")}>שדרג</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderBots() {
    return (
      <div className={pageCls("bots")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>הבוטים שלי</div><div className={c("ph-sub")}>מרכז ניהול הבוטים — סטטוס, חיבור וביצועים</div></div></div>
        {bots.length === 0 ? (
          <div className={c("card card-pad")} style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🤖</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)", marginBottom: 6 }}>עוד אין לך בוטים</div>
            <div style={{ fontSize: 13, color: "var(--t3)", marginBottom: 16, lineHeight: 1.6 }}>צור את הבוט הראשון שלך תוך דקות — בחר תבנית מוכנה ואנחנו ממלאים את רוב הפרטים.</div>
            <button className={c("btn btn-primary btn-sm")} style={{ width: "auto" }} onClick={() => router.push("/onboarding?new=1")}>צור בוט ראשון</button>
          </div>
        ) : (
        <div className={c("bots-grid")}>
          {bots.map((b, i) => {
            const col = BOT_COLORS[i % BOT_COLORS.length];
            const stats = analytics.perBot?.find((p) => p.botId === b.id);
            const category = b.business_subtype || b.business_type || null;
            const created = b.created_at ? new Date(b.created_at).toLocaleDateString("he-IL") : null;
            return (
              <div key={b.id ?? i} className={c("bot-card") + (editBot?.id === b.id ? " " + styles.sel : "")} onClick={() => openEditor(b, "general")}>
                <div className={c("bc-top")}>
                  <div className={c("bc-icon")} style={{ background: col.bg, color: col.color }}>{(b.name ?? "?").charAt(0)}</div>
                  <span className={c("badge") + " " + (b.active ? c("badge-green") : c("badge-gray"))}>
                    <span className={c("sdot") + " " + (b.active ? c("sdot-on") : c("sdot-off"))}></span>{b.active ? "פעיל" : "כבוי"}
                  </span>
                </div>
                <div className={c("bc-name")}>{b.name}</div>
                {category && <div style={{ fontSize: 11.5, color: "var(--t4)", fontWeight: 600, marginTop: -2, marginBottom: 4 }}>{category}</div>}
                <div className={c("bc-desc")}>{b.description || "—"}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
                  {(() => {
                    const status = waConnStatus(b);
                    const meta = WA_STATUS_META[status];
                    const pillBg = status === "connected" ? "var(--green-pale)" : status === "pending_verification" ? "var(--amber-pale)" : status === "error" ? "var(--red-pale)" : "var(--bg)";
                    const pillColor = status === "connected" ? "var(--green-text)" : status === "pending_verification" ? "var(--amber)" : status === "error" ? "var(--red)" : "var(--t4)";
                    const label = status === "connected" ? `וואטסאפ ${b.whatsapp_number}` : `וואטסאפ · ${meta.title}`;
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: pillBg, color: pillColor }}>
                        {meta.icon} {label}
                      </span>
                    );
                  })()}
                </div>
                {(stats || created) && (
                  <div style={{ display: "flex", gap: 14, borderTop: "1px solid var(--bdr)", paddingTop: 10, marginTop: 2 }}>
                    <div><div style={{ fontSize: 15, fontWeight: 800, color: "var(--t1)" }}>{stats?.messagesThisMonth?.toLocaleString() ?? 0}</div><div style={{ fontSize: 10.5, color: "var(--t4)" }}>הודעות החודש</div></div>
                    <div><div style={{ fontSize: 15, fontWeight: 800, color: "var(--t1)" }}>{stats?.conversations ?? 0}</div><div style={{ fontSize: 10.5, color: "var(--t4)" }}>לקוחות</div></div>
                    {created && <div style={{ marginRight: "auto", textAlign: "left" }}><div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)" }}>{created}</div><div style={{ fontSize: 10.5, color: "var(--t4)" }}>נוצר</div></div>}
                  </div>
                )}
                {!b.whatsapp_number && (
                  <button className={c("btn btn-outline btn-xs")} style={{ width: "100%", marginTop: 10 }} onClick={(e) => { e.stopPropagation(); openEditor(b, "connect"); }}>
                    חבר וואטסאפ
                  </button>
                )}
              </div>
            );
          })}
          <div className={c("add-card")} onClick={() => router.push("/onboarding?new=1")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
            <span>הוסף בוט חדש</span>
          </div>
        </div>
        )}

        {editBot && (
          <div className={c("editor") + " " + styles.open}>
            <div className={c("ed-hdr")}>
              <div className={c("ed-title")}>עריכת בוט — {editBot.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className={c("ed-tabs")} style={{ flexWrap: "wrap" }}>
                  {EDITOR_TABS.map((t) => (
                    <button key={t.key} className={c("etab") + (editorTab === t.key ? " " + styles.act : "")} onClick={() => changeEditorTab(t.key)}>{t.label}</button>
                  ))}
                </div>
                <button className={c("ed-close")} onClick={closeEditor}>✕</button>
              </div>
            </div>
            <div className={c("ed-body")}>
              {editorTab === "general" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <div className={c("form-row2")}>
                    <div className={c("fg")}><label className={c("fl")}>שם העסק</label><input className={c("fi")} value={editBot.name ?? ""} onChange={(e) => setEditBot({ ...editBot, name: e.target.value })} /></div>
                    <div className={c("fg")}>
                      <label className={c("fl")}>שם הבוט</label>
                      <input className={c("fi")} value={editBot.bot_name ?? ""} placeholder="למשל: מיטל, נציג, העוזר שלי..." onChange={(e) => setEditBot({ ...editBot, bot_name: e.target.value })} />
                      <span className={c("fhint")}>השם שלקוחות הקצה רואים בוואטסאפ</span>
                    </div>
                  </div>
                  <div className={c("fg")}><label className={c("fl")}>תיאור העסק והשירות</label><textarea className={c("fta")} value={editBot.description ?? ""} onChange={(e) => setEditBot({ ...editBot, description: e.target.value })} /><span className={c("fhint")}>Robert משתמש בתיאור זה כדי לענות ללקוחות</span></div>
                  <div className={c("form-row2")}>
                    <div className={c("fg")}><label className={c("fl")}>כתובת</label><input className={c("fi")} value={editBot.address ?? ""} placeholder="רחוב, עיר" onChange={(e) => setEditBot({ ...editBot, address: e.target.value })} /></div>
                    <div className={c("fg")}><label className={c("fl")}>טלפון ליצירת קשר</label><input className={c("fi")} value={editBot.phone ?? ""} type="tel" placeholder="03-1234567" onChange={(e) => setEditBot({ ...editBot, phone: e.target.value })} /></div>
                  </div>
                  {extendedFields ? (
                    <div className={c("fg")}><label className={c("fl")}>אתר / קישור לרשת חברתית</label><input className={c("fi")} value={editBot.website ?? ""} dir="ltr" placeholder="https://..." onChange={(e) => setEditBot({ ...editBot, website: e.target.value })} /><span className={c("fhint")}>אתר, אינסטגרם או פייסבוק — הבוט יפנה לקוחות לשם</span></div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--t4)", padding: "6px 0" }}>שדה האתר יופעל לאחר עדכון מסד הנתונים.</div>
                  )}
                </div>
              )}
              {editorTab === "hours" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 14 }}>הבוט מיידע לקוחות מתי אתם פתוחים ועונה בהתאם.</p>
                  {DAY_KEYS.map((dk, i) => {
                    const day = ensureHours(editBot)[dk];
                    return (
                      <div key={dk} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--bdr)", flexWrap: "wrap" }}>
                        <span style={{ width: 56, fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{DAYS_HE[i]}</span>
                        {day.closed ? (
                          <span style={{ flex: 1, fontSize: 13, color: "var(--t4)" }}>סגור</span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <input className={c("fi")} type="time" value={day.open} style={{ width: 110 }} onChange={(e) => updateBotHours(dk, { open: e.target.value })} />
                            <span style={{ color: "var(--t4)" }}>–</span>
                            <input className={c("fi")} type="time" value={day.close} style={{ width: 110 }} onChange={(e) => updateBotHours(dk, { close: e.target.value })} />
                          </div>
                        )}
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--t3)", cursor: "pointer" }}>
                          <input type="checkbox" checked={day.closed} onChange={(e) => updateBotHours(dk, { closed: e.target.checked })} /> סגור
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              {editorTab === "services" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 14 }}>השירותים והמחירים שהבוט מציג ללקוחות.</p>
                  {(editBot.services ?? []).map((s, i) => (
                    <div className={c("faq-row")} key={i}>
                      <div className={c("faq-fields")}>
                        <input className={c("faq-q")} value={s.name} placeholder="שם השירות (למשל: תספורת גבר)" onChange={(e) => updateService(i, { name: e.target.value })} />
                        <input className={c("faq-a")} value={s.price} placeholder="מחיר (למשל: ₪80)" onChange={(e) => updateService(i, { price: e.target.value })} />
                      </div>
                      <button type="button" className={c("faq-del")} title="מחק שירות" aria-label="מחק שירות" onClick={() => setEditBot({ ...editBot, services: (editBot.services ?? []).filter((_, j) => j !== i) })}>🗑</button>
                    </div>
                  ))}
                  <button className={c("btn btn-outline btn-sm")} style={{ marginTop: 4 }} onClick={() => setEditBot({ ...editBot, services: [...(editBot.services ?? []), { name: "", price: "" }] })}>+ הוסף שירות</button>
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
                  {manualStep !== "success" && (() => {
                    const status = waConnStatus(editBot);
                    const meta = WA_STATUS_META[status];
                    const subText =
                      status === "connected" ? "הבוט פעיל ועונה על הודעות"
                      : status === "pending_verification" ? "ממתין לאימות קוד ה-OTP"
                      : status === "error" ? (editBot.wa_last_error || "שליחת הודעות נכשלה — נסה לנתק ולחבר מחדש")
                      : "חבר מספר כדי להפעיל";
                    const titleText = status === "connected" && editBot.whatsapp_number ? `מחובר — ${editBot.whatsapp_number}` : meta.title;
                    return (
                      <div className={c("conn-box")}>
                        <div className={c("conn-row")}>
                          <div className={c("conn-ic") + " " + c(meta.cls)} style={{ fontSize: 16 }}>
                            {meta.icon}
                          </div>
                          <div style={{ flex: "1 1 auto", minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{titleText}</div><div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{subText}</div></div>
                        </div>
                        {editBot.whatsapp_number && <button className={c("btn btn-outline btn-sm")} onClick={disconnectNumber} disabled={manualBusy}>נתק מספר</button>}
                      </div>
                    );
                  })()}
                  {!editBot.whatsapp_number && editBot.id && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)", marginBottom: 10 }}>חיבור אוטומטי (מומלץ)</p>
                      <ConnectWhatsApp
                        botId={editBot.id}
                        onConnected={(b) => setEditBot({ ...editBot, whatsapp_number: b.whatsapp_number ?? null, active: true, wa_connection_status: "connected" })}
                      />
                    </div>
                  )}
                  {(!editBot.whatsapp_number || manualStep === "success") && editBot.id && !manualAvailable && (
                    <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--t3)", lineHeight: 1.7 }}>
                      חיבור ידני יופעל בקרוב — בינתיים אפשר להתחבר דרך החיבור האוטומטי או לפנות לתמיכה.
                    </div>
                  )}
                  {(!editBot.whatsapp_number || manualStep === "success") && editBot.id && manualAvailable && (
                    <div style={{ marginTop: 16 }}>
                      {manualStep !== "success" && (
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)", marginBottom: 10 }}>חיבור מספר ידני</p>
                      )}

                      <ManualConnectWizard
                        classes={c}
                        step={manualStep}
                        phone={manualPhone}
                        code={manualCode}
                        busy={manualBusy}
                        error={manualError}
                        onPhoneChange={(v) => { setManualPhone(v); setManualError(null); setManualConfigIssue(false); }}
                        onCodeChange={(v) => { setManualCode(v.replace(/\D/g, "")); setManualError(null); }}
                        onSendCode={sendManualCode}
                        onVerify={verifyManualCode}
                        onResend={resendManualCode}
                        onChangeNumber={changeManualNumber}
                        success={{
                          title: "המספר חובר בהצלחה!",
                          sub: "הבוט פעיל ומתחיל לענות ללקוחות שכותבים למספר הזה.",
                          ctaLabel: "סגור",
                          onCta: closeManualSuccess,
                        }}
                        configIssue={manualConfigIssue}
                      />
                    </div>
                  )}
                  {!editBot.id && (
                    <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--t3)" }}>
                      שמור את הבוט קודם כדי לחבר מספר וואטסאפ.
                    </div>
                  )}
                </div>
              )}
              {editorTab === "knowledge" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <div className={c("fg")}>
                    <label className={c("fl")}>סגנון דיבור</label>
                    <select className={c("fs")} value={editBot.style ?? "friendly"} onChange={(e) => setEditBot({ ...editBot, style: e.target.value as Bot["style"] })}>
                      <option value="friendly">חברותי ונעים</option>
                      <option value="professional">מקצועי ורשמי</option>
                      <option value="short">קצר ולעניין</option>
                    </select>
                    <span className={c("fhint")}>קובע את הטון שבו הבוט מדבר עם הלקוחות</span>
                  </div>
                  {extendedFields ? (
                    <div className={c("fg")}>
                      <label className={c("fl")}>הנחיות מותאמות לבוט</label>
                      <textarea className={c("fta")} style={{ minHeight: 120 }} value={editBot.custom_instructions ?? ""} maxLength={2000} placeholder="למשל: מדיניות ביטול תור עד 24 שעות מראש; להדגיש שיש חניה בחינם; לא לקבוע תורים אחרי 20:00." onChange={(e) => setEditBot({ ...editBot, custom_instructions: e.target.value })} />
                      <span className={c("fhint")}>הנחיות חופשיות שהבוט יפעל לפיהן. הוא לעולם לא ימציא מחירים או שירותים שלא הזנת.</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--t4)", padding: "6px 0" }}>שדה ההנחיות המותאמות יופעל לאחר עדכון מסד הנתונים.</div>
                  )}
                </div>
              )}
              {editorTab === "advanced" && (
                <div className={c("etab-pane") + " " + styles.act}>
                  <div className={c("trow")}><div className={c("tinfo")}><h4>הבוט פעיל</h4><p>כיבוי זמני ללא מחיקה — הבוט מפסיק לענות ללקוחות</p></div><label className={c("tog")}><input type="checkbox" checked={!!editBot.active} onChange={(e) => setEditBot({ ...editBot, active: e.target.checked })} /><span className={c("tog-sl")}></span></label></div>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--bdr)", borderRadius: 10, padding: "12px 14px", marginTop: 12, fontSize: 12.5, color: "var(--t3)", lineHeight: 1.7 }}>
                    <strong style={{ color: "var(--t1)" }}>העברה לנציג אנושי</strong> — כשהבוט לא מצליח לענות, הוא מעביר את השיחה ל-Inbox שלך אוטומטית ומסמן אותה כממתינה. אפשר לענות ידנית ולהחזיר לבוט בכל רגע.
                  </div>
                  <div style={{ borderTop: "1px solid var(--bdr)", marginTop: 16, paddingTop: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>אזור סכנה</div>
                    <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 10 }}>מחיקת הבוט היא פעולה בלתי הפיכה — כל השיחות וההגדרות יאבדו.</div>
                    <button className={c("btn btn-danger btn-sm")} style={{ width: "auto" }} onClick={deleteBot}>מחק בוט לצמיתות</button>
                  </div>
                </div>
              )}
              <div className={c("ed-actions")}>
                <button className={c("btn btn-outline btn-sm")} onClick={closeEditor}>ביטול</button>
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
            <div className={c("inbox-search")}><input placeholder="חיפוש שיחה..." value={convSearch} onChange={(e) => setConvSearch(e.target.value)} /></div>
            <div className={c("conv-list")}>
              {(() => {
                const q = convSearch.trim().toLowerCase();
                const shown = q
                  ? convs.filter((cv) =>
                      [cv.customer_name, cv.customer_phone, cv.preview]
                        .some((f) => (f ?? "").toLowerCase().includes(q)),
                    )
                  : convs;
                if (convs.length === 0) return <div style={{ padding: 16, fontSize: 13, color: "var(--t4)" }}>אין שיחות ממתינות 🎉</div>;
                if (shown.length === 0) return <div style={{ padding: 16, fontSize: 13, color: "var(--t4)" }}>לא נמצאו שיחות התואמות לחיפוש</div>;
                return shown.map((cv, i) => {
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
                });
              })()}
            </div>
          </div>
          <div className={c("chat-wrap")}>
            {!activeConv ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, color: "var(--t4)", padding: 24 }}>
                בחר שיחה מהרשימה
              </div>
            ) : (
              <>
                <div className={c("chat-hdr")}>
                  <div><div style={{ fontSize: 14, fontWeight: 700 }}>{activeConv.customer_name ?? "—"}</div><div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>{activeConv.bots?.name ?? (DEMO_MODE ? "מספרת מיטל" : "")} · {activeConv.customer_phone ?? ""}</div></div>
                  <span className={c("badge badge-amber")}>מענה אנושי</span>
                </div>
                <div className={c("chat-msgs")}>
                  {convLoading && <div style={{ fontSize: 12.5, color: "var(--t4)" }}>טוען שיחה...</div>}
                  {convError && !convLoading && (
                    <div style={{ fontSize: 12.5, color: "var(--t3)", display: "flex", alignItems: "center", gap: 8 }}>
                      {convError}
                      <button className={c("btn btn-ghost btn-xs")} onClick={() => loadConvThread(activeConv.id, true)}>נסה שוב</button>
                    </div>
                  )}
                  {!convLoading && !convError && (convMessages[activeConv.id]?.length ?? 0) === 0 && (
                    <div style={{ fontSize: 12.5, color: "var(--t4)" }}>אין הודעות בשיחה זו עדיין</div>
                  )}
                  {(convMessages[activeConv.id] ?? []).map((m) => (
                    <div key={m.id} className={c(m.from_type === "customer" ? "bubble bin" : "bubble bagent")}>
                      {m.body}
                      <div className={c("bt")}>
                        {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        {m.from_type === "bot" ? " · Robert" : m.from_type === "human" ? " · נציג" : ""}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={c("chat-input")}>
                  <input placeholder="כתוב תגובה..." id="reply-input" onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} />
                  <button className={c("btn btn-primary btn-sm")} onClick={sendReply}>שלח</button>
                  <button className={c("btn btn-outline btn-sm")} onClick={returnToBot}>החזר ל-Robert</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderHistory() {
    const statusHe = (s: string) =>
      s === "human" ? { label: "הועבר לאדם", badge: "amber" }
        : s === "closed" ? { label: "נסגר", badge: "green" }
          : { label: "טופל ע\"י בוט", badge: "green" };
    const fmtDate = (iso?: string | null) => {
      if (!iso) return "—";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    };
    const botNames = Array.from(new Set(history.map((h) => h.bots?.name).filter(Boolean))) as string[];
    const filters = ["הכל", "הועבר לאדם", "טופל ע\"י בוט", ...botNames];
    const rows = history.filter((h) => {
      if (histFilter === "הכל") return true;
      if (histFilter === "הועבר לאדם") return h.status === "human";
      if (histFilter === "טופל ע\"י בוט") return h.status === "bot" || h.status === "closed";
      return h.bots?.name === histFilter;
    });
    return (
      <div className={pageCls("history")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>היסטוריית שיחות</div><div className={c("ph-sub")}>כל השיחות שהבוטים שלך ניהלו</div></div></div>
        <div className={c("hist-filters")}>
          {filters.map((f) => (
            <button key={f} className={c("hf-pill") + (histFilter === f ? " " + styles.act : "")} onClick={() => setHistFilter(f)}>{f}</button>
          ))}
        </div>
        <div className={c("card")}>
          <table className={c("tbl")}>
            <thead><tr><th>שם לקוח</th><th>בוט</th><th>טלפון</th><th>תאריך</th><th>סטטוס</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 28, color: "var(--t3)" }}>אין עדיין שיחות להצגה</td></tr>
              ) : rows.map((r) => {
                const st = statusHe(r.status);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.customer_name || "לקוח"}</td>
                    <td>{r.bots?.name || "—"}</td>
                    <td dir="ltr" style={{ textAlign: "right" }}>{r.customer_phone}</td>
                    <td>{fmtDate(r.last_message_at)}</td>
                    <td><span className={c("badge badge-" + st.badge)}>{st.label}</span></td>
                    <td><button className={c("btn btn-ghost btn-xs")} onClick={() => { setActiveConvId(r.id); goPage("inbox"); }}>צפה</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    const m = analytics.metrics;
    const noData = analytics.messagesThisMonth === 0;
    return (
      <div className={pageCls("analytics")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>אנליטיקס</div><div className={c("ph-sub")}>ביצועי הבוטים שלך לאורך זמן</div></div></div>
        {noData ? (
          <div className={c("card card-pad")} style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>אין עדיין נתונים החודש</div>
            <div style={{ fontSize: 13, color: "var(--t3)" }}>ברגע שהבוט יתחיל לענות ללקוחות, הביצועים יופיעו כאן.</div>
          </div>
        ) : (
        <>
        <div className={c("grid-4")} style={{ marginBottom: 16 }}>
          <div className={c("card sc")}><div className={c("sc-label")}>הודעות החודש</div><div className={c("sc-val")}>{analytics.messagesThisMonth.toLocaleString()}</div><div className={c("sc-sub up")}>↑ פעילות החודש</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>שיחות שהושלמו</div><div className={c("sc-val")}>{analytics.closedThisMonth}</div><div className={c("sc-sub up")}>{m.botAnsweredPct}% ע&quot;י הבוט</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>נענו ע&quot;י הבוט</div><div className={c("sc-val")}>{m.botAnsweredPct}%</div><div className={c("sc-sub up")}>ללא נציג אנושי</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>לקוחות פעילים</div><div className={c("sc-val")}>{m.activeCustomers ?? 0}</div><div className={c("sc-sub nt")}>שוחחו החודש</div></div>
        </div>
        <div className={c("analytics-grid")}>
          <div className={c("analytics-card")}>
            <div className={c("card-title")}>הודעות לפי חודש</div>
            <div className={c("chart-line-wrap")}>
              {analytics.monthly.map((mm, i) => (
                <div key={i} className={c("cl-bar")} style={{ height: (mm.count / monthlyMax) * 100 + "%" }}></div>
              ))}
            </div>
            <div className={c("cl-labels")}>
              {analytics.monthly.map((mm, i) => <span key={i} className={c("cl-label")}>{mm.label}</span>)}
            </div>
          </div>
          <div className={c("analytics-card")}>
            <div className={c("card-title")}>פירוט ביצועים</div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שאלות שנענו ע&quot;י בוט</span><span className={c("metric-val")}>{m.botAnsweredPct}%</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שיחות שהועברו לאדם</span><span className={c("metric-val")}>{m.handoffPct}%</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>ממוצע הודעות לשיחה</span><span className={c("metric-val")}>{m.avgMsgsPerConversation ?? 0}</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שיא הודעות ביום</span><span className={c("metric-val")}>{m.peakDayCount ?? 0}</span></div>
            <div className={c("metric-row")}><span className={c("metric-name")}>שעת שיא</span><span className={c("metric-val")}>{m.peakHourRange ?? "—"}</span></div>
          </div>
        </div>
        </>
        )}
      </div>
    );
  }

  function renderBilling() {
    return (
      <div className={pageCls("billing")}>
        <BillingTab
          sub={sub}
          usage={{
            messagesThisMonth: analytics.messagesThisMonth,
            quota: analytics.quota,
            activeBots: analytics.activeBots,
            botLimit: analytics.botLimit,
            packBalance: analytics.packBalance,
          }}
          usagePct={usagePct}
          botPct={botPct}
          accountCreatedAt={analytics.accountCreatedAt}
          billingInfo={billingInfo}
          referral={referral}
          onUpgrade={() => goPage("store")}
          onCancel={() => router.push("/cancel")}
          onBillingPortal={billingPortal}
          onCopyRef={copyRef}
        />
      </div>
    );
  }

  function renderStore() {
    return (
      <div className={pageCls("store")}>
        <StoreTab
          sub={sub}
          packBalance={analytics.packBalance}
          planAnnual={planAnnual}
          onToggleAnnual={() => setPlanAnnual((v) => !v)}
          storeTab={storeTab}
          onStoreTab={setStoreTab}
          onSelectPlan={selectPlan}
          onBuyPack={buyPack}
        />
      </div>
    );
  }

  async function saveProfile() {
    if (!accountForm.name.trim()) { toast("נא להזין שם מלא"); return; }
    if (DEMO_MODE) { toast("הפרטים נשמרו ✓"); return; }
    setSavingProfile(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: accountForm.name.trim(), phone: accountForm.phone.trim() },
    });
    setSavingProfile(false);
    if (error) { toast("שמירה נכשלה — נסה שוב."); return; }
    setUser(u => ({ ...u, name: accountForm.name.trim(), phone: accountForm.phone.trim() }));
    toast("הפרטים נשמרו ✓");
  }

  async function updatePassword() {
    if (!pwForm.current) { toast("נא להזין את הסיסמה הנוכחית"); return; }
    if (pwForm.next.length < 8) { toast("הסיסמה החדשה חייבת להכיל לפחות 8 תווים"); return; }
    if (DEMO_MODE) { toast("הסיסמה עודכנה ✓"); setPwForm({ current: "", next: "" }); return; }
    setSavingPw(true);
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current });
    if (signInErr) { toast("הסיסמה הנוכחית שגויה"); setSavingPw(false); return; }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setSavingPw(false);
    if (error) { toast("עדכון הסיסמה נכשל — נסה שוב."); return; }
    setPwForm({ current: "", next: "" });
    toast("הסיסמה עודכנה בהצלחה ✓");
  }

  function renderAccount() {
    return (
      <div className={pageCls("account")}>
        <div className={c("ph")}><div><div className={c("ph-title")}>הגדרות חשבון</div><div className={c("ph-sub")}>פרטים אישיים, אבטחה והתראות</div></div></div>
        <div className={c("grid-2")}>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>פרטים אישיים</div>
            <div className={c("fg")}><label className={c("fl")}>שם מלא</label><input className={c("fi")} value={accountForm.name} autoComplete="name" onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className={c("fg")}><label className={c("fl")}>אימייל</label><input className={c("fi")} value={user.email} readOnly autoComplete="email" style={{ opacity: 0.7 }} /></div>
            <div className={c("fg")}><label className={c("fl")}>טלפון</label><input className={c("fi")} value={accountForm.phone} placeholder="הכנס מספר טלפון" autoComplete="tel" onChange={e => setAccountForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <button className={c("btn btn-primary btn-sm")} onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "שומר..." : "שמור שינויים"}</button>
          </div>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>התראות</div>
            <div className={c("trow")}><div className={c("tinfo")}><h4>התראה על שיחה שממתינה</h4><p>כשהבוט מעביר שיחה אליך</p></div><label className={c("tog")}><input type="checkbox" checked={notifPrefs.waiting} onChange={() => toggleNotif("waiting")} /><span className={c("tog-sl")}></span></label></div>
            <div className={c("trow")}><div className={c("tinfo")}><h4>סיכום יומי במייל</h4><p>הודעות, שיחות שנסגרו, ממתינות</p></div><label className={c("tog")}><input type="checkbox" checked={notifPrefs.daily} onChange={() => toggleNotif("daily")} /><span className={c("tog-sl")}></span></label></div>
            <div className={c("trow")}><div className={c("tinfo")}><h4>התראת חריגה בהודעות</h4><p>כשמגיעים ל-80% מהמכסה</p></div><label className={c("tog")}><input type="checkbox" checked={notifPrefs.quota} onChange={() => toggleNotif("quota")} /><span className={c("tog-sl")}></span></label></div>
          </div>
          <div className={c("card card-pad")}>
            <div className={c("card-title")}>אבטחה</div>
            <div className={c("fg")} style={{ position: "relative" }}>
              <label className={c("fl")}>סיסמה נוכחית</label>
              <input className={c("fi")} type={showCurPw ? "text" : "password"} value={pwForm.current} placeholder="••••••••" autoComplete="current-password" onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} style={{ paddingLeft: 36 }} />
              <button type="button" onClick={() => setShowCurPw(s => !s)} style={{ position: "absolute", left: 8, top: 34, background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 4 }}>
                {showCurPw ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            <div className={c("fg")} style={{ position: "relative" }}>
              <label className={c("fl")}>סיסמה חדשה</label>
              <input className={c("fi")} type={showNewPw ? "text" : "password"} value={pwForm.next} placeholder="לפחות 8 תווים" autoComplete="new-password" onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} style={{ paddingLeft: 36 }} />
              <button type="button" onClick={() => setShowNewPw(s => !s)} style={{ position: "absolute", left: 8, top: 34, background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 4 }}>
                {showNewPw ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            <button className={c("btn btn-outline btn-sm")} onClick={updatePassword} disabled={savingPw}>{savingPw ? "מעדכן..." : "עדכן סיסמה"}</button>
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
          <div className={c("card sc")}><div className={c("sc-label")}>זמן תגובה לתמיכה</div><div className={c("sc-val")}>עד יום עסקים</div><div className={c("sc-sub up")}>זמין א&apos;-ה&apos;</div></div>
          <div className={c("card sc")}><div className={c("sc-label")}>סטטוס מערכת</div><div className={c("sc-val")}>תקין</div><div className={c("sc-sub up")}>כל השירותים פעילים</div></div>
        </div>
        <div className={c("support-list")}>
          <a className={c("support-item")} href="/#faq" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <div className={c("support-ic")} style={{ background: "var(--blue-pale)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg></div>
            <div><div className={c("support-title")}>מרכז עזרה</div><div className={c("support-sub")}>מדריכים, שאלות נפוצות ותיעוד המוצר</div></div>
          </a>
          <a
            className={c("support-item")}
            href={process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ? `https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP}` : "mailto:support@robertbot.co.il?subject=צ'אט תמיכה"}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <div className={c("support-ic")} style={{ background: "var(--green-pale)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
            <div><div className={c("support-title")}>צ&apos;אט עם התמיכה</div><div className={c("support-sub")}>תגובה בתוך שעתיים בימי עבודה</div></div>
          </a>
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
    if (DEMO_MODE) {
      if (input) input.value = "";
      setConvMessages((m) => ({
        ...m,
        [activeConvId]: [...(m[activeConvId] ?? []), { id: `demo-${Date.now()}`, from_type: "human", body: text, created_at: new Date().toISOString() }],
      }));
      toast("התגובה נשלחה");
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${activeConvId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "שליחת התגובה נכשלה — נסה שוב");
        return; // keep the text so the user can retry
      }
      if (input) input.value = "";
      // Append the persisted message to the open thread immediately.
      if (d?.message) {
        setConvMessages((m) => ({ ...m, [activeConvId]: [...(m[activeConvId] ?? []), d.message as ConvMessage] }));
      }
      toast("התגובה נשלחה");
    } catch {
      toast("אין חיבור לשרת — התגובה לא נשלחה");
    }
  }

  async function returnToBot() {
    if (!activeConvId) return;
    if (!DEMO_MODE) {
      await fetch(`/api/conversations/${activeConvId}/return`, { method: "POST" }).catch(() => {});
    }
    // Drop the thread cache so reopening (if it re-enters "human") refetches.
    setConvMessages((m) => {
      const next = { ...m };
      delete next[activeConvId];
      return next;
    });
    setConvs((cs) => cs.filter((cv) => cv.id !== activeConvId));
    setActiveConvId(null);
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

// useSearchParams() requires a Suspense boundary in the App Router.
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}
