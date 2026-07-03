import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import s from "./ui.module.css";

/* ---------- Skeleton ---------- */
export function Skeleton({
  width,
  height = 16,
  radius,
  className,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
}) {
  const st: CSSProperties = { width, height, borderRadius: radius, ...style };
  return <div className={[s.skeleton, className].filter(Boolean).join(" ")} style={st} aria-hidden {...rest} />;
}

/* ---------- Spinner ---------- */
export function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      className={[s.spinner, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, display: "inline-block" }}
      role="status"
      aria-label="טוען"
    />
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      {icon && <div className={s.emptyIcon}>{icon}</div>}
      <div className={s.emptyTitle}>{title}</div>
      {sub && <div className={s.emptySub}>{sub}</div>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}

/* ---------- Table ---------- */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={[s.tableWrap, className].filter(Boolean).join(" ")}>
      <table className={s.table}>{children}</table>
    </div>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({
  label,
  value,
  delta,
  deltaDirection,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaDirection?: "up" | "down";
  hint?: ReactNode;
}) {
  return (
    <div className={[s.card, s.stat].join(" ")}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
      {(delta || hint) && (
        <div className={s.statMeta}>
          {delta && (
            <span className={deltaDirection === "down" ? s.statDown : s.statUp}>{delta}</span>
          )}
          {hint}
        </div>
      )}
    </div>
  );
}

/* ---------- PageHeader ---------- */
export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={s.pageHead}>
      <div>
        <h1 className={s.pageTitle}>{title}</h1>
        {sub && <div className={s.pageSub}>{sub}</div>}
      </div>
      {actions && <div className={s.pageActions}>{actions}</div>}
    </div>
  );
}

/* ---------- LogoMark ---------- */
export function LogoMark({
  size = 30,
  withWordmark = true,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={[s.logo, className].filter(Boolean).join(" ")} style={{ fontSize: size * 0.66 }}>
      <span className={s.logoMark} style={{ width: size, height: size, fontSize: size * 0.6 }}>
        R
      </span>
      {withWordmark && <span>Robert</span>}
    </span>
  );
}
