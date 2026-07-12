"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Bot, CreditCard,
  Cpu, ShieldCheck, LogOut, ChevronRight, Activity, Menu,
  Palette, LayoutTemplate, Image as ImageIcon, FileText, Megaphone,
  Brush, BarChart3, History, Code2, UserCog, ScrollText, Search as SearchIcon, Sparkles,
} from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { hasPermission } from "@/lib/site/roles";
import type { Permission } from "@/lib/site/types";
import TopbarStatus from "@/components/admin/TopbarStatus";
import CommandPalette from "@/components/admin/CommandPalette";

export const NAV = [
  { href: "/admin",          label: "סקירה כללית",  icon: LayoutDashboard, exact: true },
  { href: "/admin/users",    label: "משתמשים",      icon: Users },
  { href: "/admin/bots",     label: "בוטים",         icon: Bot },
  { href: "/admin/billing",  label: "כספים",         icon: CreditCard },
  { href: "/admin/agents",   label: "סוכני AI",      icon: Cpu },
  { href: "/admin/assistant", label: "עוזר AI",      icon: Sparkles },
  { href: "/admin/audit",    label: "יומן פעולות",   icon: ScrollText },
  { href: "/admin/security", label: "אבטחה",         icon: ShieldCheck },
];

// Website Builder nav — each item gated by a permission.
export const BUILDER_NAV: { href: string; label: string; icon: typeof Palette; perm: Permission }[] = [
  { href: "/admin/site",           label: "עמודים",        icon: LayoutTemplate, perm: "content.read" },
  { href: "/admin/site/design",    label: "עיצוב",         icon: Palette,        perm: "design.write" },
  { href: "/admin/site/themes",    label: "ערכות נושא",    icon: Brush,          perm: "design.write" },
  { href: "/admin/site/media",     label: "מדיה",          icon: ImageIcon,      perm: "content.write" },
  { href: "/admin/site/blog",      label: "בלוג",          icon: FileText,       perm: "content.write" },
  { href: "/admin/site/banners",   label: "באנרים ופופאפים", icon: Megaphone,    perm: "content.write" },
  { href: "/admin/site/marketing", label: "הגדרות ושיווק",  icon: Megaphone,      perm: "settings.write" },
  { href: "/admin/site/analytics", label: "אנליטיקס",      icon: BarChart3,      perm: "content.read" },
  { href: "/admin/site/history",   label: "יומן וגיבוי",   icon: History,        perm: "backup.manage" },
  { href: "/admin/site/code",      label: "קוד מותאם",     icon: Code2,          perm: "code.write" },
  { href: "/admin/site/team",      label: "צוות והרשאות",  icon: UserCog,        perm: "team.manage" },
];

const PAGE_NAMES: Record<string, string> = {
  "/admin":           "סקירה כללית",
  "/admin/users":     "משתמשים",
  "/admin/bots":      "בוטים",
  "/admin/billing":   "כספים",
  "/admin/agents":    "סוכני AI",
  "/admin/assistant": "עוזר AI",
  "/admin/audit":     "יומן פעולות",
  "/admin/security":  "אבטחה",
  "/admin/site":           "בנאי האתר",
  "/admin/site/design":    "עיצוב",
  "/admin/site/themes":    "ערכות נושא",
  "/admin/site/media":     "מדיה",
  "/admin/site/blog":      "בלוג",
  "/admin/site/banners":   "באנרים ופופאפים",
  "/admin/site/marketing": "הגדרות ושיווק",
  "/admin/site/analytics": "אנליטיקס",
  "/admin/site/history":   "יומן וגיבוי",
  "/admin/site/code":      "קוד מותאם",
  "/admin/site/team":      "צוות והרשאות",
};

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export default function AdminShell({
  email,
  adminRole = null,
  children,
}: {
  email: string;
  adminRole?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const builderItems = BUILDER_NAV.filter((i) => hasPermission(adminRole, i.perm));

  // Mobile off-canvas nav — closes automatically on route change.
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [pathname]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const currentPage =
    PAGE_NAMES[pathname] ??
    (pathname.startsWith("/admin/users/") ? "פרטי משתמש" : "פאנל אדמין");

  return (
    <div className={`${styles.wrap} ${styles.root}`}>
      {/* Mobile overlay behind the drawer */}
      {navOpen && <div className={styles.sideOverlay} onClick={() => setNavOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sideTop}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <Activity size={16} color="#0a1a10" strokeWidth={2.5} />
            </div>
            <div>
              <div className={styles.brandLabel}>Robert</div>
              <div className={styles.brandSub}>Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className={styles.sideNav}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>ניהול</span>
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                >
                  <Icon
                    size={17}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={styles.navIcon}
                  />
                  {label}
                </Link>
              );
            })}
          </div>

          {builderItems.length > 0 && (
            <div className={styles.navGroup}>
              <span className={styles.navGroupLabel}>בנאי האתר</span>
              {builderItems.map(({ href, label, icon: Icon }) => {
                // /admin/site is exact; the rest match by prefix.
                const active =
                  href === "/admin/site"
                    ? pathname === href
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  >
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className={styles.navIcon} />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        <div className={styles.sideBottom}>
          <div className={styles.userRow} onClick={logout} title="יציאה">
            <div className={styles.userAvatar}>{getInitials(email)}</div>
            <div className={styles.flex1}>
              <div className={styles.userName}>{email.split("@")[0]}</div>
              <div className={styles.userRole}>מנהל ראשי</div>
            </div>
            <LogOut size={15} strokeWidth={1.8} style={{ color: "var(--t4)", flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.menuBtn}
            onClick={() => setNavOpen((o) => !o)}
            aria-label="תפריט"
          >
            <Menu size={18} />
          </button>
          <nav className={styles.breadcrumb}>
            <span>Robert</span>
            <ChevronRight size={13} strokeWidth={2} className={styles.breadcrumbSep} />
            <span className={styles.breadcrumbCurrent}>{currentPage}</span>
          </nav>
          <div className={styles.topbarRight}>
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              onClick={() => window.dispatchEvent(new Event("rb-open-palette"))}
              title="חיפוש מהיר (Ctrl+K)"
            >
              <SearchIcon size={13} strokeWidth={2} /> חיפוש
              <span className={styles.kbd}>Ctrl+K</span>
            </button>
            <span className={styles.topbarTime} suppressHydrationWarning>
              {new Date().toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}
            </span>
            <TopbarStatus />
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>

      <CommandPalette adminRole={adminRole} />
    </div>
  );
}
