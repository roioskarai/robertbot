"use client";

import { useEffect, useState } from "react";
import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { CountdownProps } from "@/lib/site/types";

const c = scoped(styles);

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s };
}

const BOX: React.CSSProperties = {
  minWidth: 64,
  padding: "12px 10px",
  background: "var(--white)",
  border: "1px solid var(--bdr)",
  borderRadius: "var(--r)",
  textAlign: "center",
  boxShadow: "var(--shadow)",
};

export default function Countdown({ props }: { props: CountdownProps }) {
  const target = new Date(props.endsAt).getTime();
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units: [number, string][] = [
    [t.d, "ימים"],
    [t.h, "שעות"],
    [t.m, "דקות"],
    [t.s, "שניות"],
  ];

  return (
    <section className={c("sec")}>
      {props.message ? (
        <div className={c("sh rv")}>
          <h2 className={c("sec-title")}>{props.message}</h2>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", direction: "ltr" }}>
        {units.map(([val, label], i) => (
          <div key={i} style={BOX}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--t1)" }}>
              {String(val).padStart(2, "0")}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
