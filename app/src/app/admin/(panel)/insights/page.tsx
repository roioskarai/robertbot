"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Info, AlertTriangle, PhoneOff } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { planLabelHe, resolvePlanId } from "@/lib/plans";

interface WaEvent {
  id: string;
  scope: string;
  twilio_code: number | null;
  kind: string | null;
  phone_masked: string | null;
  message_he: string | null;
  created_at: string;
}
interface NoNumberUser {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  subscription_status: string;
  created_at: string;
}

const SCOPE_HE: Record<string, string> = {
  "bot-connect": "חיבור מהדשבורד",
  onboarding: "אונבורדינג",
  send: "שליחת הודעה",
  check: "אימות קוד",
};
const KIND_HE: Record<string, string> = {
  config: "הגדרה/ספק",
  user: "קלט משתמש",
  rate: "הגבלת קצב",
  unknown: "לא ידוע",
};

export default function AdminInsightsPage() {
  const [errors, setErrors] = useState<WaEvent[]>([]);
  const [noNumber, setNoNumber] = useState<NoNumberUser[]>([]);
  const [counts, setCounts] = useState<{ botNoNumber: number; noBot: number }>({ botNoNumber: 0, noBot: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/insights");
    const json = await res.json().catch(() => ({}));
    setErrors(json.recentErrors ?? []);
    setNoNumber(json.botNoNumberUsers ?? []);
    setCounts(json.counts ?? { botNoNumber: 0, noBot: 0 });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const errorColumns: Column<WaEvent>[] = [
    {
      key: "created_at", label: "זמן",
      render: (e) => (
        <span className={styles.muted} style={{ fontSize: 12, whiteSpace: "nowrap" }}>
          {new Date(e.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    { key: "scope", label: "מקור", hideBelow: "sm", render: (e) => <span style={{ fontSize: 12.5 }}>{SCOPE_HE[e.scope] ?? e.scope}</span> },
    {
      key: "twilio_code", label: "קוד",
      render: (e) => e.twilio_code
        ? <span className={`${styles.badge} ${styles.badgeCancelled}`}>{e.twilio_code}</span>
        : <span className={styles.muted}>—</span>,
    },
    { key: "kind", label: "סוג", hideBelow: "md", render: (e) => <span className={styles.muted} style={{ fontSize: 12 }}>{KIND_HE[e.kind ?? ""] ?? e.kind ?? "—"}</span> },
    { key: "message_he", label: "סיבה", render: (e) => <span style={{ fontSize: 12.5 }}>{e.message_he ?? "—"}</span> },
    { key: "phone_masked", label: "מספר", hideBelow: "md", render: (e) => <span className={styles.muted} style={{ fontSize: 12, direction: "ltr", display: "inline-block" }}>{e.phone_masked ?? "—"}</span> },
  ];

  const userColumns: Column<NoNumberUser>[] = [
    {
      key: "email", label: "משתמש",
      render: (u) => (
        <Link href={`/admin/users/${u.id}`} className={styles.strong} style={{ fontSize: 13, textDecoration: "none" }}>
          {u.email}
        </Link>
      ),
    },
    { key: "full_name", label: "שם", hideBelow: "md", render: (u) => <span style={{ fontSize: 12.5 }}>{u.full_name || "—"}</span> },
    { key: "plan", label: "מסלול", hideBelow: "sm", render: (u) => <span style={{ fontSize: 12.5 }}>{planLabelHe(resolvePlanId(u.plan))}</span> },
    {
      key: "created_at", label: "נרשם",
      render: (u) => <span className={styles.muted} style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString("he-IL")}</span>,
    },
  ];

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>תובנות ואבחון</h1>
          <p className={styles.pageDesc}>
            אבחון חיבור וואטסאפ וחתכים אקציונביליים — כדי לזהות היכן משתמשים נתקעים ולשפר כל יום.
          </p>
        </div>
        <div className={styles.pageActions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
            <RefreshCw size={14} strokeWidth={2} /> רענן
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div className={styles.card} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
          <PhoneOff size={18} strokeWidth={2} style={{ color: "var(--danger)" }} />
          <div>
            <div className={styles.strong} style={{ fontSize: 18 }}>{counts.botNoNumber}</div>
            <div className={styles.muted} style={{ fontSize: 11.5 }}>יצרו בוט, לא חיברו מספר</div>
          </div>
        </div>
        <div className={styles.card} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
          <Info size={18} strokeWidth={2} style={{ color: "var(--info)" }} />
          <div>
            <div className={styles.strong} style={{ fontSize: 18 }}>{counts.noBot}</div>
            <div className={styles.muted} style={{ fontSize: 11.5 }}>נרשמו, ללא בוט כלל</div>
          </div>
        </div>
      </div>

      {/* WhatsApp connection errors */}
      <div className={styles.row} style={{ gap: 8, marginBottom: 10 }}>
        <AlertTriangle size={16} strokeWidth={2} style={{ color: "var(--warning, #d97706)" }} />
        <h2 className={styles.strong} style={{ fontSize: 15 }}>שגיאות חיבור וואטסאפ אחרונות</h2>
      </div>
      <div style={{ marginBottom: 12, fontSize: 12.5, color: "var(--t3)", lineHeight: 1.6 }}>
        כשל שליחת/אימות קוד נרשם כאן עם קוד ה-Twilio המדויק. אם הרשימה ריקה למרות תקלות —
        ודא שמיגרציה 0015 הוחלה (<code>APPROVED - DATABASE</code>).
      </div>
      <DataTable<WaEvent>
        rows={errors}
        loading={loading}
        pageSize={15}
        emptyText="אין שגיאות חיבור מתועדות"
        columns={errorColumns}
      />

      {/* Bot-without-number segment */}
      <div className={styles.row} style={{ gap: 8, margin: "24px 0 10px" }}>
        <PhoneOff size={16} strokeWidth={2} style={{ color: "var(--danger)" }} />
        <h2 className={styles.strong} style={{ fontSize: 15 }}>יצרו בוט אך לא חיברו מספר וואטסאפ</h2>
      </div>
      <DataTable<NoNumberUser>
        rows={noNumber}
        loading={loading}
        pageSize={15}
        emptyText="כל מי שיצר בוט חיבר מספר 🎉"
        columns={userColumns}
      />
    </>
  );
}
