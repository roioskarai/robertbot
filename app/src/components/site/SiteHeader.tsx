import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import ThemeToggle from "@/components/ThemeToggle";
import type { HeaderConfig } from "@/lib/site/types";
import { SmartLink } from "@/components/sections/shared";

const c = scoped(styles);

export default function SiteHeader({ header }: { header: HeaderConfig }) {
  return (
    <nav className={c("nav")}>
      <div className={c("logo")}>
        {header.logoImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={header.logoImage} alt={header.logoText ?? "logo"} style={{ height: 28 }} />
        ) : (
          <>
            {header.logoText ?? "Robert"}
            <em>.</em>
          </>
        )}
      </div>
      <div className={c("nav-right")}>
        <ul className={c("nav-links")}>
          {(header.navItems ?? []).map((item, i) => (
            <li key={i}>
              <SmartLink href={item.href}>{item.label}</SmartLink>
            </li>
          ))}
          {header.loginLabel ? (
            <li>
              <SmartLink href={header.loginHref ?? "/login"} className={c("nav-login")}>
                {header.loginLabel}
              </SmartLink>
            </li>
          ) : null}
          {header.ctaLabel ? (
            <li>
              <SmartLink href={header.ctaHref ?? "/onboarding"} className={c("nav-cta")}>
                {header.ctaLabel}
              </SmartLink>
            </li>
          ) : null}
        </ul>
        <ThemeToggle className={c("nav-theme")} />
      </div>
    </nav>
  );
}
