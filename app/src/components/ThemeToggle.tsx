"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

/**
 * Simple light↔dark flip — ONE click, ONE visible change, always.
 * (The previous 3-state cycle included a "system" hop that was often a
 * visual no-op — e.g. dark→system on a dark-OS machine — which read as
 * "the button needs two clicks".)
 *
 * "System" remains the implicit behavior for users who never touch the
 * toggle: the boot script in layout.tsx resolves a stored "system" (or
 * absent) preference before paint. The first click writes an explicit
 * light/dark preference, which naturally migrates legacy "system" values.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  // SSR has no `document`, so it renders "light"; the boot script may have
  // set the DOM to "dark" before hydration. Sync from the real applied theme
  // on mount so the icon/label never lies about the current state.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("robert-theme", next);
    } catch {
      /* blocked */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${styles.pill}${className ? " " + className : ""}`}
      aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
      title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
      suppressHydrationWarning
    >
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
    </button>
  );
}
