"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/app/admin/admin.module.css";

const NAV = [
  { href: "/admin", label: "סקירה כללית", icon: "📊" },
  { href: "/admin/users", label: "משתמשים", icon: "👥" },
  { href: "/admin/bots", label: "בוטים", icon: "🤖" },
  { href: "/admin/billing", label: "כספים", icon: "💳" },
  { href: "/admin/agents", label: "סוכני AI", icon: "⚙️" },
  { href: "/admin/security", label: "אבטחה ו-2FA", icon: "🔐" },
];

export default function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className={styles.wrap}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandDot} />
          Robert Admin
        </div>
        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.muted} style={{ padding: "0 8px 10px" }}>{email}</div>
        <button className={styles.logout} onClick={logout}>יציאה מאובטחת</button>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
