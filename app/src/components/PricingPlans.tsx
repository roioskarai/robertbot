"use client";

import Link from "next/link";
import styles from "./PricingPlans.module.css";
import { scoped } from "@/lib/cx";
import {
  PRICING, annualSaving, planLabelEn, planLabelHe,
  planChips, planIncludedFeatures, planLockedFeatures, type PlanId,
} from "@/lib/plans";

const c = scoped(styles);

// Presentation-only per-plan config. All plan NAMES, PRICES, CHIPS and FEATURE
// LISTS come from lib/plans.ts (the single source of truth) — this array only
// holds the visual treatment (card variant, badge, chip colors, CTA).
interface PlanDef {
  id: PlanId;
  variant: "" | "popular" | "agency";
  popBadge?: string;
  chipClasses: [string, string]; // color class for [bots-chip, messages-chip]
  cta: { type: string; text: string; href: string };
  savingColor?: string;
}

const PLANS: PlanDef[] = [
  {
    id: "basic",
    variant: "",
    chipClasses: ["chip-green", "chip-blue"],
    cta: { type: "cta-outline", text: "התחל 7 ימים חינם", href: "/onboarding" },
  },
  {
    id: "pro",
    variant: "popular",
    popBadge: "⭐ הכי פופולרי",
    chipClasses: ["chip-green", "chip-blue"],
    cta: { type: "cta-green", text: "התחל 7 ימים חינם", href: "/onboarding" },
  },
  {
    id: "business",
    variant: "",
    chipClasses: ["chip-green", "chip-blue"],
    cta: { type: "cta-outline", text: "התחל 7 ימים חינם", href: "/onboarding" },
  },
  {
    id: "enterprise",
    variant: "agency",
    chipClasses: ["chip-purple", "chip-purple"],
    cta: { type: "cta-purple", text: "דבר איתנו", href: "mailto:hi@robertbot.co.il" },
    savingColor: "#c084fc",
  },
];

interface Props {
  annual: boolean;
  /** When provided, plan CTAs become buttons that call this (e.g. Stripe checkout)
      instead of linking to /onboarding. Enterprise always opens contact. */
  onSelect?: (id: PlanId) => void;
  /** Highlights the user's current plan with a disabled "פעיל" button. */
  currentPlan?: PlanId;
  /** Hides the trial line (e.g. inside the dashboard). */
  hideTrialLine?: boolean;
}

export default function PricingPlans({ annual, onSelect, currentPlan, hideTrialLine }: Props) {
  return (
    <div className={styles.plansRoot}>
      <div className={c("plans")}>
        {PLANS.map((p) => {
          const price = annual ? PRICING[p.id].annual : PRICING[p.id].monthly;
          const isContact = p.cta.href.startsWith("mailto:");
          const isCurrent = currentPlan === p.id;
          const chips = planChips(p.id);
          const included = planIncludedFeatures(p.id);
          const locked = planLockedFeatures(p.id);
          return (
            <div key={p.id} className={c("plan " + p.variant)}>
              {p.popBadge && <div className={c("pop-badge")}>{p.popBadge}</div>}
              <div className={c("plan-label")}>{planLabelEn(p.id)}</div>
              <div className={c("plan-name")}>{planLabelHe(p.id)}</div>
              <div className={c("plan-price-wrap")}>
                <div className={c("plan-price")}>
                  <span className={c("price-cur")}>₪</span>
                  {price}
                  <span className={c("price-per")}>/חודש</span>
                </div>
                {annual && (
                  <div className={c("price-annual")} style={p.savingColor ? { color: p.savingColor } : undefined}>
                    חיסכון ₪{annualSaving(p.id).toLocaleString()} בתשלום שנתי
                  </div>
                )}
              </div>

              <div className={c("stat-chips")}>
                {chips.map((text, i) => (
                  <span key={i} className={c("chip " + p.chipClasses[i])}>{text}</span>
                ))}
              </div>

              <div className={c("divider")}></div>

              <div className={c("feat-list")}>
                {included.map((f, i) => (
                  <div key={i} className={c("feat-item")}>
                    <span className={c("feat-icon")}>✓</span> {f}
                  </div>
                ))}
                {locked.length > 0 && <div className={c("feat-divider-label")}>לא כלול במסלול זה</div>}
                {locked.map((f, i) => (
                  <div key={i} className={c("feat-item feat-excluded")}>
                    <span className={c("feat-icon-x")}>✕</span>
                    <span className={c("feat-locked")}>
                      {f}
                      <span className={c("tooltip")}>שדרג כדי לפתוח תכונה זו</span>
                    </span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <button className={c("plan-cta cta-outline")} disabled style={{ opacity: 0.5, cursor: "default" }}>המסלול הנוכחי</button>
              ) : isContact ? (
                <a href={p.cta.href} className={c("plan-cta " + p.cta.type)}>{p.cta.text}</a>
              ) : onSelect ? (
                <button className={c("plan-cta " + p.cta.type)} onClick={() => onSelect(p.id)}>
                  {currentPlan ? "מעבר למסלול" : p.cta.text}
                </button>
              ) : (
                <Link href={p.cta.href} className={c("plan-cta " + p.cta.type)}>{p.cta.text}</Link>
              )}
            </div>
          );
        })}
      </div>
      {!hideTrialLine && (
        <p className={c("trial-line")}>7 ימי ניסיון חינם בכל מסלול · ביטול בכל עת · ללא כרטיס אשראי</p>
      )}
    </div>
  );
}
