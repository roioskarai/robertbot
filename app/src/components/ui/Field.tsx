import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import s from "./ui.module.css";

/** Label + hint + error wrapper for any form control. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className={s.field}>
      {label && (
        <label className={s.label} htmlFor={htmlFor}>
          {label}
          {required && <span className={s.req}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className={s.fieldError} role="alert">
          {error}
        </div>
      ) : (
        hint && <div className={s.hint}>{hint}</div>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...rest }: InputProps) {
  const cls = [s.input, error && s.inputError, className].filter(Boolean).join(" ");
  return <input className={cls} aria-invalid={error || undefined} {...rest} />;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className, ...rest }: TextareaProps) {
  const cls = [s.textarea, error && s.inputError, className].filter(Boolean).join(" ");
  return <textarea className={cls} aria-invalid={error || undefined} {...rest} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className, children, ...rest }: SelectProps) {
  const cls = [s.select, error && s.inputError, className].filter(Boolean).join(" ");
  return (
    <select className={cls} aria-invalid={error || undefined} {...rest}>
      {children}
    </select>
  );
}
