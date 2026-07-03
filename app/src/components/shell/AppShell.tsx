"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/ui";
import s from "./shell.module.css";

export interface ShellNavItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  href?: string;
  badge?: ReactNode;
  onClick?: () => void;
}

export interface ShellNavGroup {
  label?: ReactNode;
  items: ShellNavItem[];
}

/**
 * V2 app shell: deep ink-green sidebar + light topbar (design-lab dashboard).
 * Nav is data-driven so the dashboard (wave 6) and admin (wave 7) share it.
 */
export default function AppShell({
  nav,
  activeId,
  topbarTitle,
  topbarActions,
  footer,
  children,
  homeHref = "/",
}: {
  nav: ShellNavGroup[];
  activeId?: string;
  topbarTitle?: ReactNode;
  topbarActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  homeHref?: string;
}) {
  const [open, setOpen] = useState(false);

  function renderItem(item: ShellNavItem) {
    const cls = [s.navItem, item.id === activeId && s.navItemActive].filter(Boolean).join(" ");
    const inner = (
      <>
        {item.icon}
        {item.label}
        {item.badge != null && <span className={s.navBadge}>{item.badge}</span>}
      </>
    );
    if (item.href) {
      return (
        <Link
          key={item.id}
          href={item.href}
          className={cls}
          aria-current={item.id === activeId ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          {inner}
        </Link>
      );
    }
    return (
      <button
        key={item.id}
        type="button"
        className={cls}
        onClick={() => {
          setOpen(false);
          item.onClick?.();
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={s.shell}>
      <aside className={[s.sidebar, open && s.sidebarOpen].filter(Boolean).join(" ")} aria-label="ניווט ראשי">
        <Link href={homeHref} className={s.logoRow}>
          <LogoMark withWordmark={false} size={30} />
          Robert
        </Link>
        {nav.map((group, gi) => (
          <nav key={gi} aria-label={typeof group.label === "string" ? group.label : undefined}>
            {group.label && <div className={s.groupLabel}>{group.label}</div>}
            {group.items.map(renderItem)}
          </nav>
        ))}
        {footer && <div className={s.foot}>{footer}</div>}
      </aside>

      {open && <div className={s.scrim} onClick={() => setOpen(false)} aria-hidden />}

      <div className={s.main}>
        <header className={s.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className={s.menuBtn}
              onClick={() => setOpen((v) => !v)}
              aria-label="פתח תפריט"
              aria-expanded={open}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {topbarTitle && <h1 className={s.topbarTitle}>{topbarTitle}</h1>}
          </div>
          {topbarActions && <div className={s.topbarActions}>{topbarActions}</div>}
        </header>
        <div className={s.body}>{children}</div>
      </div>
    </div>
  );
}

/** Sidebar footer user chip (name + plan + optional action). */
export function ShellUser({
  name,
  sub,
  action,
}: {
  name: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  const initial = typeof name === "string" && name.length > 0 ? name[0] : "R";
  return (
    <div className={s.navItem} style={{ cursor: "default" }}>
      <span className={s.avatar}>{initial}</span>
      <span style={{ lineHeight: 1.3, minWidth: 0 }}>
        <span className={s.footName} style={{ display: "block" }}>{name}</span>
        {sub && <span className={s.footSub}>{sub}</span>}
      </span>
      {action && <span style={{ marginInlineStart: "auto", display: "flex" }}>{action}</span>}
    </div>
  );
}
