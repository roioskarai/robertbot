"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, RefreshCw, Pencil, KeyRound, Trash2, ShieldCheck, ShieldOff,
  UserRound, CreditCard, Gauge, Clock, Bot as BotIcon, Copy,
} from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { deriveSubscriptionState } from "@/lib/subscription";
import { PLAN_LIMITS, resolvePlanId, planLabelHe } from "@/lib/plans";
import type { TimelineEvent, TimelineKind } from "@/lib/admin-timeline";

interface DetailUser {
  id: string; email: string; full_name: string | null;
  role: string; plan: string; subscription_status: string;
  billing_cycle: string | null;
  trial_ends_at: string | null; subscription_ends_at: string | null;
  cancel_at_period_end: boolean; is_comp: boolean; comp_note: string | null;
  pack_balance: number; is_suspended: boolean; totp_enabled: boolean;
  last_login_at: string | null; created_at: string;
}

interface DetailBot {
  id: string; name: string; bot_name: string | null; active: boolean;
  whatsapp_number: string | null; wa_provider: string | null; created_at: string;
}

const KIND_ICON: Record<TimelineKind, typeof Clock> = {
  registration: UserRound, login: Clock, payment: CreditCard, admin: ShieldCheck, agent: Gauge,
};

const KIND_COLOR: Record<TimelineKind, string> = {
  registration: "var(--info)", login: "var(--t3)", payment: "var(--accent)",
  admin: "var(--warning)", agent: "var(--info)",
};

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalBox: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
  padding: 22, width: "100%", maxWidth: 440,
};

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<DetailUser | null>(null);
  const [bots, setBots] = useState<DetailBot[]>([]);
  const [usage, setUsage] = useState(0);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit-profile modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  // Pack-balance inline edit
  const [packEdit, setPackEdit] = useState<string | null>(null);

  // Danger zone
  const [resetBusy, setResetBusy] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, tRes] = await Promise.all([
      fetch(`/api/admin/users/${id}`),
      fetch(`/api/admin/users/${id}/timeline`),
    ]);
    if (dRes.status === 404) { setNotFound(true); setLoading(false); return; }
    const d = await dRes.json().catch(() => ({}));
    const t = await tRes.json().catch(() => ({}));
    setUser(d.user ?? null);
    setBots(d.bots ?? []);
    setUsage(d.usageThisMonth ?? 0);
    setEvents(t.events ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function patch(body: Record<string, unknown>, msg?: string): Promise<boolean> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "העדכון נכשל");
      return false;
    }
    await load();
    if (msg) showToast(msg);
    return true;
  }

  async function saveProfile() {
    if (!user) return;
    setEditBusy(true); setEditErr(null);
    const body: Record<string, unknown> = {};
    if (editName.trim() !== (user.full_name ?? "")) body.full_name = editName.trim() || null;
    if (editEmail.trim().toLowerCase() !== user.email.toLowerCase()) body.email = editEmail.trim();
    if (!Object.keys(body).length) { setEditOpen(false); setEditBusy(false); return; }
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setEditBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setEditErr(d.error || "העדכון נכשל");
      return;
    }
    setEditOpen(false);
    await load();
    showToast("הפרטים עודכנו");
  }

  async function sendReset() {
    setResetBusy(true);
    const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setResetBusy(false);
    if (!res.ok) { showToast(d.error || "יצירת האיפוס נכשלה"); return; }
    if (d.emailed) showToast("מייל איפוס סיסמה נשלח למשתמש");
    else setResetLink(d.link ?? null);
  }

  async function doDelete() {
    setDeleteBusy(true); setDeleteErr(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail: deleteConfirm.trim() }),
    });
    setDeleteBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setDeleteErr(d.error || "המחיקה נכשלה");
      return;
    }
    router.push("/admin/users");
  }

  if (notFound) {
    return (
      <div className={styles.card} style={{ textAlign: "center", padding: 48 }}>
        <div className={styles.strong} style={{ fontSize: 16, marginBottom: 8 }}>המשתמש לא נמצא</div>
        <Link href="/admin/users" className={`${styles.btn} ${styles.btnGhost}`} style={{ display: "inline-flex" }}>
          <ArrowRight size={14} strokeWidth={2} /> חזרה לרשימה
        </Link>
      </div>
    );
  }

  const sub = user ? deriveSubscriptionState(user) : null;
  const quota = user ? PLAN_LIMITS[resolvePlanId(user.plan)].messages : 0;
  const usagePct = quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.row} style={{ gap: 8, marginBottom: 4 }}>
            <Link href="/admin/users" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>
              <ArrowRight size={13} strokeWidth={2} /> משתמשים
            </Link>
          </div>
          <h1 className={styles.pageTitle}>{loading ? "טוען…" : user?.email}</h1>
          <p className={styles.pageDesc}>
            {user && (
              <span className={styles.row} style={{ gap: 6, flexWrap: "wrap" }}>
                {user.role === "admin" && <span className={`${styles.badge} ${styles.badgeAdmin}`}>אדמין</span>}
                {user.is_suspended && <span className={`${styles.badge} ${styles.badgeCancelled}`}>חסום</span>}
                {user.is_comp && <span className={`${styles.badge} ${styles.badgeGreen}`}>חינם</span>}
                <span className={styles.muted}>נרשם {fmtDateTime(user.created_at)}</span>
              </span>
            )}
          </p>
        </div>
        <div className={styles.pageActions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
            <RefreshCw size={14} strokeWidth={2} /> רענן
          </button>
        </div>
      </div>

      {/* ── Cards row ── */}
      <div className={`${styles.grid} ${styles.g3}`} style={{ marginBottom: 18 }}>
        {/* Profile */}
        <div className={styles.card}>
          <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <div className={styles.cardTitle} style={{ margin: 0 }}><UserRound size={14} strokeWidth={2} /> פרופיל</div>
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              onClick={() => {
                if (!user) return;
                setEditName(user.full_name ?? "");
                setEditEmail(user.email);
                setEditErr(null);
                setEditOpen(true);
              }}
            >
              <Pencil size={12} strokeWidth={2} /> עריכה
            </button>
          </div>
          {loading || !user ? <div className={styles.skeleton} style={{ height: 72 }} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <span className={styles.muted}>שם מלא</span>
                <span className={styles.strong}>{user.full_name || "—"}</span>
              </div>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <span className={styles.muted}>אימייל</span>
                <span className={styles.strong} style={{ direction: "ltr" }}>{user.email}</span>
              </div>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <span className={styles.muted}>כניסה אחרונה</span>
                <span>{fmtDateTime(user.last_login_at)}</span>
              </div>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <span className={styles.muted}>אימות דו-שלבי</span>
                {user.totp_enabled
                  ? <span className={styles.row} style={{ gap: 4, color: "var(--success)", fontSize: 12.5 }}><ShieldCheck size={13} /> פעיל</span>
                  : <span className={styles.row} style={{ gap: 4, color: "var(--t4)", fontSize: 12.5 }}><ShieldOff size={13} /> כבוי</span>}
              </div>
            </div>
          )}
        </div>

        {/* Subscription state (read-only card; management center arrives in batch 3) */}
        <div className={styles.card}>
          <div className={styles.cardTitle}><CreditCard size={14} strokeWidth={2} /> מצב מנוי</div>
          {loading || !sub ? <div className={styles.skeleton} style={{ height: 72 }} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className={styles.strong} style={{ fontSize: 15 }}>{sub.headlineHe}</div>
              <div className={styles.muted} style={{ fontSize: 12.5 }}>{sub.sublineHe}</div>
              <div className={styles.row} style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span className={`${styles.badge} ${
                  sub.status === "active" || sub.status === "cancel_scheduled" ? styles.badgeActive
                    : sub.status === "trial" ? styles.badgeTrial
                      : sub.status === "paused" ? styles.badgePaused
                        : styles.badgeCancelled
                }`}>
                  {planLabelHe(sub.plan)}
                </span>
                {sub.priceIls !== null && <span className={styles.muted} style={{ fontSize: 12.5 }}>₪{sub.priceIls}/חודש</span>}
                {sub.isComp && <span className={`${styles.badge} ${styles.badgeGreen}`}>הענקה</span>}
              </div>
            </div>
          )}
        </div>

        {/* Usage */}
        <div className={styles.card}>
          <div className={styles.cardTitle}><Gauge size={14} strokeWidth={2} /> שימוש החודש</div>
          {loading || !user ? <div className={styles.skeleton} style={{ height: 72 }} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className={styles.row} style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                  <span className={styles.muted}>הודעות</span>
                  <span className={styles.strong}>{usage.toLocaleString("he-IL")} / {quota.toLocaleString("he-IL")}</span>
                </div>
                <div style={{ height: 7, background: "var(--surface-3)", borderRadius: 100, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${usagePct}%`, borderRadius: 100,
                    background: usagePct >= 90 ? "var(--danger)" : usagePct >= 70 ? "var(--warning)" : "var(--accent)",
                  }} />
                </div>
              </div>
              <div className={styles.row} style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                <span className={styles.muted}>יתרת חבילות</span>
                {packEdit === null ? (
                  <span className={styles.row} style={{ gap: 6 }}>
                    <span className={styles.strong}>{user.pack_balance.toLocaleString("he-IL")}</span>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                      onClick={() => setPackEdit(String(user.pack_balance))}>
                      <Pencil size={11} strokeWidth={2} />
                    </button>
                  </span>
                ) : (
                  <span className={styles.row} style={{ gap: 6 }}>
                    <input
                      className={`${styles.input} ${styles.inputSm}`}
                      style={{ width: 90, direction: "ltr", textAlign: "center" }}
                      type="number" min={0} value={packEdit}
                      onChange={(e) => setPackEdit(e.target.value)}
                    />
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                      onClick={async () => {
                        const n = Math.max(0, Math.floor(Number(packEdit)));
                        if (Number.isNaN(n)) return;
                        if (await patch({ pack_balance: n, _note: "עדכון יתרת חבילות ידני" }, "היתרה עודכנה")) setPackEdit(null);
                      }}>
                      שמור
                    </button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setPackEdit(null)}>ביטול</button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bots ── */}
      <div className={styles.card} style={{ marginBottom: 18 }}>
        <div className={styles.cardTitle}><BotIcon size={14} strokeWidth={2} /> בוטים ({bots.length})</div>
        <DataTable<DetailBot>
          rows={bots}
          loading={loading}
          pageSize={10}
          emptyText="אין בוטים למשתמש זה"
          columns={([
            { key: "name", label: "עסק", sortable: true, render: (b) => <span className={styles.strong} style={{ fontSize: 13 }}>{b.name}</span> },
            { key: "bot_name", label: "שם הבוט", hideBelow: "sm", render: (b) => b.bot_name ?? "—" },
            {
              key: "active", label: "סטטוס", align: "center",
              render: (b) => <span className={`${styles.badge} ${b.active ? styles.badgeActive : styles.badgeCancelled}`}>{b.active ? "פעיל" : "כבוי"}</span>,
            },
            {
              key: "whatsapp_number", label: "וואטסאפ", hideBelow: "md",
              render: (b) => b.whatsapp_number
                ? <span style={{ direction: "ltr", fontSize: 12.5 }}>{b.whatsapp_number}</span>
                : <span className={styles.muted}>לא מחובר</span>,
            },
            {
              key: "created_at", label: "נוצר", sortable: true, hideBelow: "md",
              render: (b) => <span className={styles.muted} style={{ fontSize: 12 }}>{new Date(b.created_at).toLocaleDateString("he-IL")}</span>,
            },
          ] as Column<DetailBot>[])}
        />
      </div>

      {/* ── Timeline ── */}
      <div className={styles.card} style={{ marginBottom: 18 }}>
        <div className={styles.cardTitle}><Clock size={14} strokeWidth={2} /> ציר זמן</div>
        {loading ? <div className={styles.skeleton} style={{ height: 120 }} /> : events.length === 0 ? (
          <div className={styles.tableEmpty}>אין אירועים עדיין</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {events.map((e, i) => {
              const Icon = KIND_ICON[e.kind] ?? Clock;
              return (
                <div key={`${e.ts}-${i}`} className={styles.row}
                  style={{ gap: 12, padding: "10px 2px", borderBottom: i < events.length - 1 ? "1px solid var(--border-soft)" : "none", alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: KIND_COLOR[e.kind] ?? "var(--t3)",
                  }}>
                    <Icon size={13} strokeWidth={2} />
                  </div>
                  <div className={styles.flex1}>
                    <div className={styles.strong} style={{ fontSize: 13 }}>{e.labelHe}</div>
                    {e.detailHe && <div className={styles.muted} style={{ fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{e.detailHe}</div>}
                  </div>
                  <div className={styles.muted} style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{fmtDateTime(e.ts)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className={styles.card} style={{ borderColor: "#4a2222" }}>
        <div className={styles.cardTitle} style={{ color: "var(--danger)" }}>אזור סכנה</div>
        <div className={styles.row} style={{ gap: 8, flexWrap: "wrap" }}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={sendReset} disabled={resetBusy || !user}>
            <KeyRound size={14} strokeWidth={2} /> {resetBusy ? "יוצר קישור…" : "איפוס סיסמה"}
          </button>
          {user && (
            <button
              className={`${styles.btn} ${user.is_suspended ? styles.btnGhost : styles.btnDanger}`}
              onClick={() => patch(
                { is_suspended: !user.is_suspended },
                user.is_suspended ? "המשתמש שוחרר" : "המשתמש נחסם והבוטים כובו",
              )}
            >
              {user.is_suspended ? "שחרר חסימה" : "חסום משתמש"}
            </button>
          )}
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => { setDeleteConfirm(""); setDeleteErr(null); setDeleteOpen(true); }}
            disabled={!user || user.role === "admin"}
            title={user?.role === "admin" ? "אי אפשר למחוק חשבון אדמין" : undefined}
          >
            <Trash2 size={14} strokeWidth={2} /> מחיקת משתמש
          </button>
        </div>
      </div>

      {/* ── Edit profile modal ── */}
      {editOpen && user && (
        <div style={modalBackdrop} onClick={() => !editBusy && setEditOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="עריכת פרטים">
            <div className={styles.strong} style={{ fontSize: 15, marginBottom: 14 }}>עריכת פרטים — {user.email}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                שם מלא
                <input className={styles.input} value={editName} maxLength={120}
                  onChange={(e) => setEditName(e.target.value)} placeholder="שם המשתמש" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                אימייל
                <input className={styles.input} style={{ direction: "ltr" }} value={editEmail} maxLength={160}
                  onChange={(e) => setEditEmail(e.target.value)} type="email" />
              </label>
              <p className={styles.muted} style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                שינוי אימייל מעדכן גם את חשבון ההתחברות — המשתמש ייכנס מעכשיו עם הכתובת החדשה.
              </p>
              {editErr && <div style={{ color: "var(--danger)", fontSize: 12.5 }} role="alert">{editErr}</div>}
              <div className={styles.row} style={{ justifyContent: "flex-end", gap: 8 }}>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setEditOpen(false)} disabled={editBusy}>ביטול</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveProfile} disabled={editBusy}>
                  {editBusy ? "שומר…" : "שמור"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset-link modal (only when email couldn't be sent) ── */}
      {resetLink && (
        <div style={modalBackdrop} onClick={() => setResetLink(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="קישור איפוס">
            <div className={styles.strong} style={{ fontSize: 15, marginBottom: 10 }}>קישור איפוס סיסמה</div>
            <p className={styles.muted} style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
              שליחת המייל לא זמינה כרגע — העבר את הקישור למשתמש בערוץ מאובטח. הקישור חד-פעמי.
            </p>
            <div className={styles.row} style={{ gap: 8 }}>
              <input className={styles.input} style={{ direction: "ltr", fontSize: 12 }} readOnly value={resetLink}
                onFocus={(e) => e.currentTarget.select()} />
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                onClick={() => { navigator.clipboard?.writeText(resetLink); showToast("הקישור הועתק"); }}>
                <Copy size={13} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.row} style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setResetLink(null)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteOpen && user && (
        <div style={modalBackdrop} onClick={() => !deleteBusy && setDeleteOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="מחיקת משתמש">
            <div className={styles.strong} style={{ fontSize: 15, marginBottom: 10, color: "var(--danger)" }}>
              מחיקת משתמש — פעולה בלתי הפיכה
            </div>
            <p className={styles.muted} style={{ fontSize: 12.5, lineHeight: 1.7, marginBottom: 12 }}>
              יימחקו לצמיתות: החשבון, הבוטים, כל השיחות וההודעות. רשומות תשלום נשמרות ביומן.
              להמשך — הקלד את כתובת האימייל של המשתמש:
            </p>
            <input className={styles.input} style={{ direction: "ltr" }} value={deleteConfirm}
              onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteErr(null); }}
              placeholder={user.email} type="email" />
            {deleteErr && <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 8 }} role="alert">{deleteErr}</div>}
            <div className={styles.row} style={{ justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>ביטול</button>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={doDelete}
                disabled={deleteBusy || deleteConfirm.trim().toLowerCase() !== user.email.toLowerCase()}
              >
                {deleteBusy ? "מוחק…" : "מחק לצמיתות"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${styles.toastOk}`}>
          <ShieldCheck size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
          {toast}
        </div>
      )}
    </>
  );
}
