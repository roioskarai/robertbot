import type { ReactNode } from "react";
import s from "./ui.module.css";

type Tone = "green" | "gray" | "warn" | "error" | "info";

const TONE: Record<Tone, string> = {
  green: s.badgeGreen,
  gray: s.badgeGray,
  warn: s.badgeWarn,
  error: s.badgeError,
  info: s.badgeInfo,
};

export default function Badge({
  tone = "gray",
  dot,
  children,
  className,
}: {
  tone?: Tone;
  /** Leading status dot in the current tone. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const cls = [s.badge, TONE[tone], className].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      {dot && <span className={s.badgeDot} aria-hidden />}
      {children}
    </span>
  );
}
