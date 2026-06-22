import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { FooterConfig } from "@/lib/site/types";
import { SmartLink } from "@/components/sections/shared";

const c = scoped(styles);

export default function SiteFooter({ footer }: { footer: FooterConfig }) {
  return (
    <footer className={c("footer")}>
      <div className={c("footer-logo")}>
        {footer.logoText ?? "Robert"}
        <em>.</em>
      </div>
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
