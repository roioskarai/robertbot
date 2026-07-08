"use client";

import styles from "@/app/dashboard/dashboard.module.css";
import { scoped } from "@/lib/cx";
import PricingPlans from "@/components/PricingPlans";
import { MESSAGE_PACKS, PLAN_LIMITS, planLabelHe, packPerMessageHe, type PlanId } from "@/lib/plans";
import type { SubscriptionState } from "@/lib/subscription";

const c = scoped(styles);

interface Props {
  sub: SubscriptionState;
  packBalance: number;
  planAnnual: boolean;
  onToggleAnnual: () => void;
  storeTab: "plans" | "packs";
  onStoreTab: (t: "plans" | "packs") => void;
  onSelectPlan: (id: PlanId) => void;
  onBuyPack: (product: string) => void;
}

/**
 * "מחירון וחנות" — PURCHASING only: compare plans, upgrade, buy message packs.
 * No account status, no invoices, no payment method (those live in Billing).
 * The current-plan strip is read from the derived state — a trial user is asked
 * to CHOOSE a plan (with the trial countdown), never shown a price as if owned.
 */
export default function StoreTab({
  sub, packBalance, planAnnual, onToggleAnnual, storeTab, onStoreTab, onSelectPlan, onBuyPack,
}: Props) {
  const limits = PLAN_LIMITS[sub.plan];
  // Only mark a plan as "current" when the user actually holds it (paying/comp).
  const currentPlan: PlanId | undefined = sub.canPurchasePacks ? sub.plan : undefined;

  const strip = (() => {
    if (sub.status === "active" || sub.status === "cancel_scheduled") {
      return {
        title: sub.priceIls != null
          ? `${planLabelHe(sub.plan)} — ₪${sub.priceIls}/חודש`
          : `מסלול ${planLabelHe(sub.plan)}`,
        sub: `${limits.messages.toLocaleString()} הודעות · ${limits.bots === 1 ? "בוט אחד" : `${limits.bots} בוטים`} · ${sub.sublineHe}`,
      };
    }
    if (sub.status === "trial") {
      return {
        title: "בחר את המסלול שלך",
        sub: sub.trialDaysLeft != null
          ? `הניסיון מסתיים בעוד ${sub.trialDaysLeft} ${sub.trialDaysLeft === 1 ? "יום" : "ימים"} — בחר מסלול כדי להמשיך`
          : "בחר מסלול כדי להמשיך אחרי הניסיון",
      };
    }
    if (sub.status === "trial_expired") {
      return { title: "הניסיון הסתיים", sub: "בחר מסלול כדי להפעיל מחדש את הבוטים" };
    }
    return { title: "אין מנוי פעיל", sub: "בחר מסלול כדי להפעיל את הבוט שלך" };
  })();

  return (
    <>
      <div className={c("ph")}>
        <div>
          <div className={c("ph-title")}>מחירון וחנות</div>
          <div className={c("ph-sub")}>בחירת מסלול, שדרוג ורכישת חבילות הודעות</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <button className={c("hf-pill") + (storeTab === "plans" ? " " + styles.act : "")} onClick={() => onStoreTab("plans")}>מסלולים</button>
        <button className={c("hf-pill") + (storeTab === "packs" ? " " + styles.act : "")} onClick={() => onStoreTab("packs")}>Packs — הודעות נוספות</button>
      </div>

      {storeTab === "plans" && (
        <div>
          <div style={{ background: "linear-gradient(135deg,#1c1f2e,#2d3350)", borderRadius: "var(--r-lg)", padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                {sub.canPurchasePacks ? "המסלול שלך" : "בחירת מסלול"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{strip.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{strip.sub}</div>
            </div>
            <button className={c("btn btn-outline btn-sm")} style={{ color: "#fff", borderColor: "rgba(255,255,255,.3)" }} onClick={onToggleAnnual}>
              {planAnnual ? "הצג חיוב חודשי" : "הצג חיוב שנתי (−20%)"}
            </button>
          </div>
          <PricingPlans annual={planAnnual} onSelect={onSelectPlan} currentPlan={currentPlan} hideTrialLine />
          <p style={{ fontSize: 12, color: "var(--t4)", textAlign: "center", marginTop: 8 }}>
            {sub.isPaying ? "שינוי מסלול: שדרוג מיידי, שנמוך בתחילת תקופת החיוב הבאה" : "7 ימי ניסיון חינם · ללא כרטיס אשראי · ביטול בכל עת"}
          </p>
        </div>
      )}

      {storeTab === "packs" && (
        <div>
          <div style={{ background: "var(--warning-50)", border: "1px solid var(--warning-500)", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--warning-700)", lineHeight: 1.7 }}>
            <strong>כיצד Pack עובד:</strong> מכסת המנוי <strong>מנוצלת קודם</strong> בכל חודש. רק לאחר שנגמרה — הבוט צורך מה-Pack. ה-Pack <strong>לא פוקע</strong> ועובר לחודש הבא.
          </div>
          {!sub.canPurchasePacks && (
            <div style={{ background: "var(--red-pale)", border: "1px solid #fecaca", borderRadius: "var(--r)", padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "var(--red)", textAlign: "center" }}>
              רכישת Packs זמינה למנויים פעילים בלבד.{" "}
              <button className={c("btn btn-ghost btn-xs")} style={{ color: "var(--red)", fontWeight: 700, textDecoration: "underline", padding: 0 }} onClick={() => onStoreTab("plans")}>בחר מסלול תחילה</button>
            </div>
          )}
          {packBalance > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>מאגר Pack נוכחי</div>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--green-d)" }}>{packBalance.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {MESSAGE_PACKS.map((pk) => {
              const best = pk.id === "regular";
              return (
                <div key={pk.id} style={{ background: best ? "var(--green-50)" : "var(--bg)", border: best ? "2px solid var(--green)" : "1px solid var(--bdr)", borderRadius: "var(--r-lg)", padding: 16, textAlign: "center", position: "relative" }}>
                  {best && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 100, whiteSpace: "nowrap" }}>הכי נמכר</div>}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{pk.name}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--t1)", marginBottom: 3 }}>{pk.messages.toLocaleString()} הודעות</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "var(--green-d)", letterSpacing: -1, marginBottom: 2 }}>₪{pk.price}</div>
                  <div style={{ fontSize: 11, color: "var(--t4)", marginBottom: 12 }}>{packPerMessageHe(pk.id)}</div>
                  <button className={c(best ? "btn btn-primary btn-xs" : "btn btn-outline btn-xs")} style={{ width: "100%", opacity: sub.canPurchasePacks ? 1 : 0.4 }} disabled={!sub.canPurchasePacks} onClick={() => onBuyPack(`pack_${pk.id}`)}>רכוש</button>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "var(--t4)", textAlign: "center", marginTop: 12 }}>כל הרכישות מאובטחות · Grow · חשבונית תישלח למייל</p>
        </div>
      )}
    </>
  );
}
