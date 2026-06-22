"use client";

import { useState } from "react";
import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { FaqProps } from "@/lib/site/types";

const c = scoped(styles);

export default function Faq({ props }: { props: FaqProps }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className={c("sec")} id="faq">
      <div className={c("sh rv")}>
        {props.tag ? <div className={c("tag tp")}>{props.tag}</div> : null}
        <h2 className={c("sec-title")}>{props.title}</h2>
      </div>
      <div className={c("faqs")}>
        {(props.items ?? []).map((f, i) => (
          <div className={c("faq rv") + (open === i ? " " + styles.open : "")} key={i}>
            <div className={c("fq")} onClick={() => setOpen(open === i ? null : i)}>
              {f.q}
              <span className={c("farr")}>▼</span>
            </div>
            <div className={c("fa")}>{f.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
