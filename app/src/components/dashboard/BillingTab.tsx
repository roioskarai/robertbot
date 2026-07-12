"use client";

import styles from "@/app/dashboard/dashboard.module.css";
import { scoped } from "@/lib/cx";
import type { SubscriptionState } from "@/lib/subscription";
import type { BillingInfo } from "@/lib/payments/types";
import SubscriptionTimeline from "./SubscriptionTimeline";
import TrialBanner from "./TrialBanner";

const c = scoped(styles);

const cardBrandHe = (b: string) =>
  b === "visa" ? "ויזה" : b === "mastercard" ? "מאסטרקארד" : b === "amex" ? "אמקס" : b;
const invStatusHe = (s: string) =>
  s === "paid" ? "שולם" : s === "open" ? "ממתין" : s === "void" ? "בוטל" : s;

interface Props {
  sub: SubscriptionState;
  usage: { messagesThisMonth: number; quota: number; activeBots: number; botLimit: number; packBalance: number };
  usagePct: number;
  botPct: number;
  accountCreatedAt?: string | null;
  billingInfo: BillingInfo | null;
  referral: { link: string; friends: number; earned: number; available: number } | null;
  onUpgrade: () => void;
  onCancel: () => void;
  onBillingPortal: () => void;
  onCopyRef: () => void;
}

/**
 * "מנוי וחיוב" — the customer's CURRENT SITUATION only. No plan grid, no pack
 * shop (those live in the Store tab). Shows: status timeline, usage, payment
 * method + invoices, and account actions (upgrade / cancel / referral).
 */
export default function BillingTab({
  sub, usage, usagePct, botPct, accountCreatedAt, billingInfo,
  onUpgrade, onCancel, onBillingPortal,
}: Props) {
  return (
    <>
      <div className={c("ph")}>
        <div>
          <div className={c("ph-title")}>מנוי וחיוב</div>
          <div className={c("ph-sub")}>מצב המנוי, השימוש והתשלומים שלך</div>
        </div>
      </div>

      <TrialBanner sub={sub} onChoosePlan={onUpgrade} />

      <div className={c("grid-2")}>
        <div>
          <SubscriptionTimeline sub={sub} accountCreatedAt={accountCreatedAt} />

          <div className={c("card card-pad")}>
            <div className={c("card-title")}>השימוש שלך החודש</div>
            <div className={c("ubar-wrap")}>
              <div className={c("ubar-top")}><span>הודעות החודש</span><span style={{ fontWeight: 600 }}>{usage.messagesThisMonth.toLocaleString()} / {usage.quota.toLocaleString()}</span></div>
              <div className={c("ubar")}><div className={c("ubar-fill")} style={{ width: usagePct + "%" }}></div></div>
            </div>
            <div className={c("ubar-wrap")}>
              <div className={c("ubar-top")}><span>בוטים פעילים</span><span style={{ fontWeight: 600 }}>{usage.activeBots} / {usage.botLimit}</span></div>
              <div className={c("ubar")}><div className={c("ubar-fill")} style={{ width: botPct + "%" }}></div></div>
            </div>
            {usage.packBalance > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)", borderRadius: 10, padding: "10px 14px", marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>מאגר Pack נוסף</div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--green-d)" }}>{usage.packBalance.toLocaleString()}</span>
              </div>
            )}
            <button className={c("btn btn-outline btn-sm")} style={{ width: "100%", marginTop: 14 }} onClick={onUpgrade}>
              צריך יותר? עבור לחנות לשדרוג או רכישת Packs
            </button>
          </div>
        </div>

        <div>
          <div className={c("card card-pad")} style={{ marginBottom: 16 }}>
            <div className={c("card-title")}>אמצעי תשלום</div>
            {billingInfo?.card ? (
              <div className={c("cc-row")}>
                <div className={c("cc-icon")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg></div>
                <div className={c("cc-info")}><div className={c("cc-num")}>{cardBrandHe(billingInfo.card.brand)} •••• {billingInfo.card.last4}</div><div className={c("cc-exp")}>פג תוקף {String(billingInfo.card.expMonth).padStart(2, "0")}/{String(billingInfo.card.expYear).slice(-2)}</div></div>
                <button className={c("btn btn-outline btn-xs")} onClick={onBillingPortal}>עדכן</button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--t3)", padding: "8px 0" }}>
                {billingInfo && !billingInfo.supported
                  ? "פרטי התשלום מנוהלים אצל ספק הסליקה."
                  : sub.isPaying ? "אין כרטיס אשראי שמור עדיין." : "אין אמצעי תשלום — יתווסף בעת הצטרפות למסלול."}
              </div>
            )}
            <div className={c("card-title")} style={{ marginTop: 16 }}>חשבוניות</div>
            {billingInfo?.invoices?.length ? (
              <table className={c("tbl")}>
                <thead><tr><th>תאריך</th><th>סכום</th><th>סטטוס</th><th></th></tr></thead>
                <tbody>
                  {billingInfo.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{new Date(inv.date * 1000).toLocaleDateString("he-IL")}</td>
                      <td style={{ fontWeight: 600 }}>₪{inv.amount}</td>
                      <td><span className={c("badge badge-" + (inv.status === "paid" ? "green" : "amber"))}>{invStatusHe(inv.status)}</span></td>
                      <td>{inv.url ? <a className={c("btn btn-ghost btn-xs")} href={inv.url} target="_blank" rel="noopener noreferrer">הורד</a> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 13, color: "var(--t3)", padding: "8px 0" }}>אין חשבוניות להצגה.</div>
            )}
          </div>

          <div className={c("card card-pad")} style={{ marginBottom: 16 }}>
            <div className={c("card-title")}>ניהול המנוי</div>
            <button className={c("btn btn-primary btn-sm")} style={{ width: "100%", marginBottom: 8 }} onClick={onUpgrade}>
              {sub.isPaying ? "שנה מסלול" : "בחר מסלול"}
            </button>
            {sub.isPaying && (
              <button className={c("btn btn-ghost btn-sm")} style={{ width: "100%", color: "var(--t3)" }} onClick={onCancel}>
                ביטול מנוי
              </button>
            )}
            {!sub.isPaying && sub.status !== "trial" && (
              <div style={{ fontSize: 12, color: "var(--t4)", textAlign: "center", marginTop: 4 }}>אין מנוי פעיל לביטול.</div>
            )}
          </div>

          {/* Referral rewards are not live yet — the tracking/credit system
              hasn't shipped. Until it does we show a "coming soon" card instead
              of promising ₪50 that would never be credited. */}
          <div className={c("ref-box")}>
            <div className={c("ref-title")}>חבר מביא חבר</div>
            <div className={c("ref-sub")}>
              <span style={{ display: "inline-block", background: "var(--green-p, #e6f7ee)", color: "var(--green-d, #0a7d3e)", fontWeight: 700, fontSize: 12, borderRadius: 999, padding: "2px 10px", marginBottom: 8 }}>בקרוב 🚀</span>
              <br />
              תוכנית ההפניות בדרך. נעדכן אותך ברגע שתהיה זמינה — ואז כל הזמנה של חבר תזכה את שניכם.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
