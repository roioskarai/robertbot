import type { ZodType } from "zod";

/**
 * Uniform body validation for API routes: returns the parsed data or a
 * single Hebrew-friendly error message (first issue wins — matches the
 * one-toast-per-error UX the app already has).
 */
export function parseBody<T>(
  schema: ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; message: string } {
  const res = schema.safeParse(body);
  if (res.success) return { ok: true, data: res.data };
  const first = res.error.issues[0];
  const message = first?.message && !/^Invalid|^Required/i.test(first.message)
    ? first.message
    : "בקשה לא תקינה";
  return { ok: false, message };
}
