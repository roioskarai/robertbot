"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Pref = "light" | "dark" | "system";

const ORDER: Pref[] = ["light", "dark", "system"];
const LABEL: Record<Pref, string> = {
  light: "מצב בהיר",
  dark: "מצב כהה",
  system: "לפי המערכת",
};

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(pref: Pref) {
  document.documentElement.dataset.theme = pref === "system" ? systemTheme() : pref;
}

/**
 * Three-state theme toggle: light → dark → system.
 * The preference is stored in localStorage ("robert-theme"); the resolved
 * theme is applied as html[data-theme]. The boot script in layout.tsx applies
 * the stored preference before paint to avoid a flash.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<Pref>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("robert-theme") as Pref | null;
      if (saved === "dark" || saved === "system") setPref(saved);
    } catch {
      /* blocked */
    }
  }, []);

  // While in system mode, follow live OS changes.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setPref(next);
    apply(next);
    try {
      localStorage.setItem("robert-theme", next);
    } catch {
      /* blocked */
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={`${styles.pill}${className ? " " + className : ""}`}
      aria-label={`ערכת נושא: ${LABEL[pref]} — לחץ להחלפה`}
      title={LABEL[pref]}
      suppressHydrationWarning
    >
      {pref === "system" ? (
        <span className={styles.iconMoon}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </span>
      ) : (
        <>
          <span className={styles.iconMoon}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </span>
          <span className={styles.iconSun}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </span>
        </>
      )}
    </button>
  );
}
