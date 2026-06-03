"use client";

import Link from "next/link";
import styles from "./PricingPlans.module.css";
import { scoped } from "@/lib/cx";
import { PRICING, annualSaving, type PlanId } from "@/lib/plans";

const c = scoped(styles);

interface PlanDef {
  id: PlanId;
  label: string; // English label chip
  name: string; // Hebrew name
  variant: "" | "popular" | "agency";
  popBadge?: string;
  chips: { text: string; cls: string }[];
  included: string[];
  locked: string[];
  cta: { type: string; text: string; href: string };
  savingColor?: string;
}

const PLANS: PlanDef[] = [
  {
    id: "basic",
    label: "Basic",
    name: "בסיסי",
    variant: "",
    chips: [
      { text: "1 בוט", cls: "chip-green" },
      { text: "300 הודעות", cls: "chip-blue" },
    ],
    included: ["סוכן AI אחד", "מענה אוטומטי על שאלות", "קביעת תורים אוטומטית", "Packs הודעות נוספות"],
    locked: [
      "שיחות חכמות עם הלקוח", "זיכרון שיחה אישי ללקוח", "ניהול יומן מלא",
      "סנכרון עם Google Calendar", "לכידת לידים אוטומטית", "העברה לנציג אנושי",
      "דוחות וסטטיסטיקות", "ניהול מספר עסקים", "API וחיבורים חיצוניים",
      "תמיכה מועדפת", "תמיכה ייעודית 24/7",
    ],
    cta: { type: "cta-outline", text: "התחל 7 ימים חינם", href: "/onboarding" },
  },
  {
    id: "pro",
    label: "Pro",
    name: "מקצועי",
    variant: "popular",
    popBadge: "⭐ הכי פופולרי",
    chips: [
      { text: "2 בוטים", cls: "chip-green" },
      { text: "1,000 הודעות", cls: "chip-blue" },
    ],
    included: [
      "עד 2 סוכני AI", "מענה אוטומטי על שאלות", "שיחות חכמות עם הלקוח",
      "קביעת תורים אוטומטית", "ניהול יומן מלא", "לכידת לידים אוטומטית",
      "העברה לנציג אנושי", "דוחות וסטטיסטיקות", "Packs הודעות נוספות",
    ],
    locked: [
      "זיכרון שיחה אישי ללקוח", "סנכרון עם Google Calendar", "ניהול מספר עסקים",
      "API וחיבורים חיצוניים", "תמיכה מועדפת", "תמיכה ייעודית 24/7",
    ],
    cta: { type: "cta-green", text: "התחל 7 ימים חינם", href: "/onboarding" },
  },
  {
    id: "business",
    label: "Business",
    name: "עסקים",
    variant: "",
    chips: [
      { text: "5 בוטים", cls: "chip-green" },
      { text: "6,000 הודעות", cls: "chip-blue" },
    ],
    included: [
      "עד 5 סוכני AI", "מענה אוטומטי על שאלות", "שיחות חכמות עם הלקוח",
      "זיכרון שיחה אישי ללקוח", "קביעת תורים אוטומטית", "ניהול יומן מלא",
      "סנכרון עם Google Calendar", "לכידת לידים אוטומטית", "העברה לנציג אנושי",
      "דוחות וסטטיסטיקות", "Packs הודעות נוספות", "תמיכה מועדפת",
    ],
    locked: ["ניהול מספר עסקים", "API וחיבורים חיצוניים", "תמיכה ייעודית 24/7"],
    cta: { type: "cta-outline", text: "התחל 7 ימים חינם", href: "/onboarding" },
  },
  {
    id: "enterprise",
    label: "Enterprise",
    name: "ארגוני",
    variant: "agency",
    chips: [
      { text: "15 בוטים", cls: "chip-purple" },
      { text: "15,000 הודעות", cls: "chip-purple" },
    ],
    included: [
      "עד 15 סוכני AI", "מענה אוטומטי על שאלות", "שיחות חכמות עם הלקוח",
      "זיכרון שיחה אישי ללקוח", "קביעת תורים אוטומטית", "ניהול יומן מלא",
      "סנכרון עם Google Calendar", "לכידת לידים אוטומטית", "העברה לנציג אנושי",
      "דוחות וסטטיסטיקות", "Packs הודעות נוספות", "ניהול מספר עסקים",
      "API וחיבורים חיצוניים", "תמיכה מועדפת", "תמיכה ייעודית 24/7",
    ],
    locked: [],
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
          return (
            <div key={p.id} className={c("plan " + p.variant)}>
              {p.popBadge && <div className={c("pop-badge")}>{p.popBadge}</div>}
              <div className={c("plan-label")}>{p.label}</div>
              <div className={c("plan-name")}>{p.name}</div>
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
                {p.chips.map((ch, i) => (
                  <span key={i} className={c("chip " + ch.cls)}>{ch.text}</span>
                ))}
              </div>

              <div className={c("divider")}></div>

              <div className={c("feat-list")}>
                {p.included.map((f, i) => (
                  <div key={i} className={c("feat-item")}>
                    <span className={c("feat-icon")}>✓</span> {f}
                  </div>
                ))}
                {p.locked.length > 0 && <div className={c("feat-divider-label")}>לא כלול במסלול זה</div>}
                {p.locked.map((f, i) => (
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
