"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import s from "./ui.module.css";

export interface TabItem {
  id: string;
  label: ReactNode;
  badge?: ReactNode;
}

/**
 * Accessible in-page tabs (ARIA tablist). Arrow-key navigation is
 * RTL-aware: ArrowLeft advances, ArrowRight goes back (visual order).
 */
export default function Tabs({
  tabs,
  active,
  onChange,
  className,
  ariaLabel,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.id === active);
    if (idx < 0) return;
    let next = -1;
    if (e.key === "ArrowLeft") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowRight") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    const btn = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    btn?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={[s.tabs, className].filter(Boolean).join(" ")}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={[s.tab, isActive && s.tabActive].filter(Boolean).join(" ")}
            onClick={() => onChange(t.id)}
          >
            {t.label}
            {t.badge != null && <span className={s.tabBadge}>{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
