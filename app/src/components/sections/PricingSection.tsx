"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import PricingPlans from "@/components/PricingPlans";
import type { PricingProps } from "@/lib/site/types";
import { nl2br } from "./shared";

const c = scoped(styles);

export default function PricingSection({ props }: { props: PricingProps }) {
  const [annual, setAnnual] = useState(false);

  return (
    <section className={c("sec")} id="pricing">
      <div className={c("sh rv")}>
        {props.tag ? <div className={c("tag tg")}>{props.tag}</div> : null}
        <h2 className={c("sec-title")}>{nl2br(props.title)}</h2>
        {props.subtitle ? <p className={c("sec-sub")}>{props.subtitle}</p> : null}
      </div>

      {props.showToggle !== false ? (
        <div className={c("billing-toggle-wrap rv")}>
          <span className={c("billing-label" + (annual ? "" : " act"))}>חיוב חודשי</span>
          <label className={c("ios-toggle")}>
            <input type="checkbox" checked={annual} onChange={(e) => setAnnual(e.target.checked)} />
            <div className={c("ios-track")}></div>
            <div className={c("ios-thumb")}></div>
          </label>
          <span className={c("billing-label" + (annual ? " act" : ""))}>
            חיוב שנתי
            <span className={c("save-badge")}>חיסכון 20%</span>
          </span>
        </div>
      ) : null}

      <PricingPlans annual={annual} />
      <div className={c("rv")} style={{ textAlign: "center", marginTop: 14 }}>
        <Link
          href="/pricing"
          style={{ color: "var(--green-d)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
        >
          השוואת מסלולים מלאה ←
        </Link>
      </div>

      {props.footnote ? (
        <div className={c("rv")} style={{ marginTop: 18, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--bg)",
              border: "1px solid var(--bdr)",
              borderRadius: 100,
              padding: "8px 18px",
              fontSize: 13,
              color: "var(--t3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            {props.footnote}
          </div>
        </div>
      ) : null}
    </section>
  );
}
