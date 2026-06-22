"use client";

// Reusable form primitives + toast for the Website Builder admin pages.
// Styled with the admin design tokens (var(--surface) etc., which cascade from
// the AdminShell .root wrapper).

import { useCallback, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 9,
  color: "var(--t1)",
  fontSize: 13.5,
  fontFamily: "inherit",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--t3)",
  marginBottom: 6,
};

export function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label ? <span style={labelStyle}>{label}</span> : null}
      {children}
      {hint ? (
        <span style={{ display: "block", fontSize: 11, color: "var(--t4)", marginTop: 4 }}>{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 90, resize: "vertical", ...props.style }} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" {...props} style={{ ...inputStyle, ...props.style }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...props.style }} />;
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 38, height: 34, border: "1px solid var(--border)", borderRadius: 8, background: "transparent", cursor: "pointer" }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, flex: 1 }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 999, position: "relative", flexShrink: 0,
          background: checked ? "var(--accent)" : "var(--surface-3)", transition: "background .15s",
        }}
      >
        <span
          style={{
            position: "absolute", top: 2, insetInlineStart: checked ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "inset-inline-start .15s",
          }}
        />
      </span>
      {label ? <span style={{ fontSize: 13, color: "var(--t2)" }}>{label}</span> : null}
    </label>
  );
}

export function Btn({
  variant = "ghost",
  children,
  ...rest
}: { variant?: "primary" | "ghost" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls =
    variant === "primary"
      ? `${styles.btn} ${styles.btnPrimary}`
      : `${styles.btn} ${styles.btnGhost}`;
  return (
    <button
      {...rest}
      className={`${cls} ${rest.className ?? ""}`}
      style={variant === "danger" ? { ...rest.style, color: "var(--danger)" } : rest.style}
    >
      {children}
    </button>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={styles.card} style={{ padding: 18, ...style }}>
      {children}
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────
export function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const ToastHost = toast ? (
    <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
      {toast.ok ? (
        <CheckCircle size={14} strokeWidth={2} style={{ color: "var(--accent)" }} />
      ) : (
        <XCircle size={14} strokeWidth={2} style={{ color: "var(--danger)" }} />
      )}
      {toast.msg}
    </div>
  ) : null;
  return { showToast, ToastHost };
}
