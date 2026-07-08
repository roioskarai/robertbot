"use client";

import styles from "@/app/dashboard/dashboard.module.css";
import { scoped } from "@/lib/cx";
import type { SubscriptionState } from "@/lib/subscription";

const c = scoped(styles);

const ClockIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const LockIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/**
 * A status banner shown at the top of Overview and Billing. Renders ONLY for
 * states that need the user to act — trial (countdown + choose), expired trial
 * and cancelled (locked, must pick a plan). Returns null for healthy states.
 */
export default function TrialBanner({
  sub,
  onChoosePlan,
}: {
  sub: SubscriptionState;
  onChoosePlan: () => void;
}) {
  if (sub.status === "trial") {
    return (
      <div className={c("tb-banner tb-banner-info")}>
        <div className={c("tb-banner-ic")} style={{ background: "var(--blue)" }}>{ClockIcon}</div>
        <div className={c("tb-banner-body")}>
          <div className={c("tb-banner-title")}>{sub.headlineHe}</div>
          <div className={c("tb-banner-sub")}>{sub.sublineHe} · בחר מסלול כדי להמשיך ללא הפסקה בשירות בתום הניסיון.</div>
        </div>
        <button className={c("btn btn-primary btn-sm")} onClick={onChoosePlan}>בחר מסלול</button>
      </div>
    );
  }

  if (sub.status === "trial_expired") {
    return (
      <div className={c("tb-banner tb-banner-warn")}>
        <div className={c("tb-banner-ic")} style={{ background: "var(--red)" }}>{LockIcon}</div>
        <div className={c("tb-banner-body")}>
          <div className={c("tb-banner-title")}>תקופת הניסיון הסתיימה — הבוטים הושבתו</div>
          <div className={c("tb-banner-sub")}>בחר מסלול כדי להפעיל מחדש את הבוטים ולחזור לענות ללקוחות.</div>
        </div>
        <button className={c("btn btn-primary btn-sm")} onClick={onChoosePlan}>הפעל מחדש</button>
      </div>
    );
  }

  if (sub.status === "cancelled") {
    return (
      <div className={c("tb-banner tb-banner-warn")}>
        <div className={c("tb-banner-ic")} style={{ background: "var(--red)" }}>{LockIcon}</div>
        <div className={c("tb-banner-body")}>
          <div className={c("tb-banner-title")}>אין מנוי פעיל</div>
          <div className={c("tb-banner-sub")}>הבוטים כבויים. חדש את המנוי כדי להפעיל אותם מחדש.</div>
        </div>
        <button className={c("btn btn-primary btn-sm")} onClick={onChoosePlan}>חדש מנוי</button>
      </div>
    );
  }

  return null;
}
