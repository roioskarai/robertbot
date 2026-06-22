import Link from "next/link";
import type { CtaLink } from "@/lib/site/types";
import { Fragment } from "react";

/** Render a string with "\n" as <br/> (titles in the design use line breaks). */
export function nl2br(text: string): React.ReactNode {
  const parts = text.split("\n");
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

/** Internal links use next/link; anchors (#id) and mailto/external use a plain <a>. */
export function SmartLink({
  href,
  className,
  children,
  style,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const isInternal = href.startsWith("/") && !href.startsWith("//");
  if (isInternal) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}

export function Cta({ cta, className }: { cta: CtaLink; className?: string }) {
  return (
    <SmartLink href={cta.href} className={className}>
      {cta.label}
    </SmartLink>
  );
}
