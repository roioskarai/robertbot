import type { HTMLAttributes, ReactNode } from "react";
import s from "./ui.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds inner padding (space-6). */
  pad?: boolean;
  /** Lift-on-hover affordance for clickable cards. */
  hover?: boolean;
}

export default function Card({ pad, hover, className, children, ...rest }: CardProps) {
  const cls = [s.card, pad && s.cardPad, hover && s.cardHover, className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CardHead({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={s.cardHead}>
      <div>
        <div className={s.cardTitle}>{title}</div>
        {sub && <div className={s.cardSub}>{sub}</div>}
      </div>
      {actions}
    </div>
  );
}
