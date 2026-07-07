import Link from "next/link";
import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import ThemeToggle from "@/components/ThemeToggle";
import HeaderAuth from "@/components/site/HeaderAuth";
import type { HeaderConfig } from "@/lib/site/types";
import { SmartLink } from "@/components/sections/shared";

const c = scoped(styles);

export default function SiteHeader({ header }: { header: HeaderConfig }) {
  return (
    <nav className={c("nav")}>
      {/* logo always navigates home */}
      <Link href="/" className={c("logo")} style={{ textDecoration: "none" }}>
        {header.logoImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={header.logoImage} alt={header.logoText ?? "logo"} style={{ height: 28 }} />
        ) : (
          <>
            {header.logoText ?? "Robert"}
            <em>.</em>
          </>
        )}
      </Link>
      <div className={c("nav-right")}>
        <ul className={c("nav-links")}>
          {(header.navItems ?? []).map((item, i) => (
            <li key={i}>
              <SmartLink href={item.href}>{item.label}</SmartLink>
            </li>
          ))}
        </ul>
        {/* auth buttons live OUTSIDE .nav-links so the mobile media query
            (which hides the links) never hides them — always visible,
            auth-aware, on every viewport (owner item #10) */}
        <div className={c("nav-auth")}>
          <HeaderAuth
            as="div"
            loginLabel={header.loginLabel ?? "כניסה"}
            loginHref={header.loginHref ?? "/login"}
            ctaLabel={header.ctaLabel ?? "הרשמה חינם"}
            ctaHref={header.ctaHref ?? "/onboarding"}
            loginClass={c("nav-login")}
            ctaClass={c("nav-cta")}
          />
        </div>
        <ThemeToggle className={c("nav-theme")} />
      </div>
    </nav>
  );
}
