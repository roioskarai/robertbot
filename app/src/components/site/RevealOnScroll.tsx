"use client";

// Client island that reproduces the original reveal-on-scroll behavior from the
// landing page: it observes every element carrying the `.rv` class (from
// landing.module.css) inside its subtree and adds `.on` when it enters view.
// Server-rendered sections are passed through as children.

import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

export default function RevealOnScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("." + styles.rv);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting)
            setTimeout(() => e.target.classList.add(styles.on), i * 55);
        });
      },
      { threshold: 0.06 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
