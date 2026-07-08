"use client";

import styles from "@/app/dashboard/dashboard.module.css";
import { scoped } from "@/lib/cx";
import { planLabelHe } from "@/lib/plans";
import type { SubscriptionState } from "@/lib/subscription";

const c = scoped(styles);

function heDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The "where am I in my subscription" card at the top of the billing tab.
 * Reads a derived SubscriptionState — so it shows a ₪ price ONLY when the user
 * is truly paying, and a live day-countdown while on trial.
 */
export default function SubscriptionTimeline({
  sub,
  accountCreatedAt,
}: {
  sub: SubscriptionState;
  accountCreatedAt?: string | null;
}) {
  const chip =
    sub.status === "active" || sub.status === "cancel_scheduled"
      ? { cls: "tl-chip tl-chip-active", text: sub.isComp ? "הענקה" : "פעיל" }
      : sub.status === "trial"
        ? { cls: "tl-chip tl-chip-trial", text: "ניסיון חינם" }
        : sub.status === "trial_expired" || sub.status === "cancelled"
          ? { cls: "tl-chip tl-chip-danger", text: sub.status === "cancelled" ? "אין מנוי" : "הניסיון הסתיים" }
          : { cls: "tl-chip tl-chip-warn", text: "מוקפא" };

  const cycleHe = sub.cycle === "annual" ? "שנתי" : "חודשי";
  const isTrial = sub.status === "trial" || sub.status === "trial_expired";

  return (
    <div className={c("card card-pad")} style={{ marginBottom: 16 }}>
      <div className={c("tl-head")}>
        <div className={c("card-title")} style={{ marginBottom: 0 }}>{sub.headlineHe}</div>
        <span className={c(chip.cls)}>{chip.text}</span>
      </div>

      {sub.status === "trial" && sub.trialDaysLeft != null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span className={c("tl-count")}>{sub.trialDaysLeft}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--t3)" }}>
            {sub.trialDaysLeft === 1 ? "יום נותר בניסיון" : "ימים נותרו בניסיון"}
          </span>
        </div>
      )}

      <div className={c("tl")}>
        <div className={c("tl-row")}>
          <span className={c("tl-dot tl-dot-on")} />
          <div>
            <div className={c("tl-label")}>תאריך הצטרפות</div>
            <div className={c("tl-val")}>{heDate(accountCreatedAt)}</div>
          </div>
        </div>

        {isTrial ? (
          <div className={c("tl-row")}>
            <span className={c("tl-dot" + (sub.status === "trial" ? " tl-dot-on" : ""))} />
            <div>
              <div className={c("tl-label")}>{sub.status === "trial" ? "סיום תקופת הניסיון" : "הניסיון הסתיים"}</div>
              <div className={c("tl-val")}>{heDate(sub.trialEndsAt)}</div>
            </div>
          </div>
        ) : (
          <div className={c("tl-row")}>
            <span className={c("tl-dot" + (sub.isPaying || sub.isComp ? " tl-dot-on" : ""))} />
            <div>
              <div className={c("tl-label")}>
                {sub.status === "cancel_scheduled" ? "מסתיים בתאריך" : sub.status === "active" ? "חידוש הבא" : "סטטוס"}
              </div>
              <div className={c("tl-val")}>{sub.periodEndsAt ? heDate(sub.periodEndsAt) : sub.sublineHe}</div>
            </div>
          </div>
        )}

        <div className={c("tl-row")}>
          <span className={c("tl-dot")} />
          <div>
            <div className={c("tl-label")}>{sub.isPaying ? "מחזור חיוב" : "כלול בניסיון"}</div>
            <div className={c("tl-val")}>
              {sub.isPaying && sub.priceIls != null
                ? `₪${sub.priceIls} · ${cycleHe}`
                : isTrial
                  ? `כל יכולות מסלול ${planLabelHe(sub.plan)}`
                  : cycleHe}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
