"use client";

import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

export default function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const current = (document.documentElement.dataset.theme as Theme) || "light";
    const next: Theme = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("robert-theme", next); } catch { /* blocked */ }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${styles.pill}${className ? " " + className : ""}`}
      aria-label="החלף מצב בהיר/כהה"
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
