import Link from "next/link";
import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { FooterConfig } from "@/lib/site/types";
import { SmartLink } from "@/components/sections/shared";
import { LogoInk } from "@/components/logo";

const c = scoped(styles);

export default function SiteFooter({ footer }: { footer: FooterConfig }) {
  // A tenant that customised their site name keeps its text wordmark; the
  // default (Robert's own site) renders the brand logo.
  const custom = footer.logoText && footer.logoText !== "Robert";
  return (
    <footer className={c("footer")}>
      <Link href="/" className={c("footer-logo")} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
        {custom ? (
          <>
            {footer.logoText}
            <em>.</em>
          </>
        ) : (
          <LogoInk variant="wordmark" style={{ height: 24, width: "auto", color: "var(--t1)" }} />
        )}
      </Link>
      {footer.copyright ? <div className={c("footer-copy")}>{footer.copyright}</div> : null}
      <div className={c("footer-links")}>
        {(footer.links ?? []).map((l, i) => (
          <SmartLink key={i} href={l.href}>
            {l.label}
          </SmartLink>
        ))}
      </div>
    </footer>
  );
}
