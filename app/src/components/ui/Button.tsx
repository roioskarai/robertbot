"use client";

import type { ButtonHTMLAttributes } from "react";
import s from "./ui.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "wa";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary: s.primary,
  secondary: s.secondary,
  ghost: s.ghost,
  danger: s.danger,
  wa: s.wa,
};

export default function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    s.btn,
    VARIANT[variant],
    size === "sm" && s.sm,
    size === "lg" && s.lg,
    block && s.block,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className={s.btnSpin} aria-hidden />}
      {children}
    </button>
  );
}
