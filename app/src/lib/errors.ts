import { NextResponse } from "next/server";

/** Maps common Supabase/auth error messages to Hebrew. */
export function hebAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists"))
    return "כתובת המייל כבר רשומה";
  if (m.includes("invalid login")) return "אימייל או סיסמה שגויים";
  if (m.includes("password")) return "הסיסמה אינה תקינה (לפחות 6 תווים)";
  if (m.includes("email")) return "כתובת מייל לא תקינה";
  if (m.includes("fetch") || m.includes("network"))
    return "החיבור לשרת נכשל — ודא שמפתחות Supabase מוגדרים";
  return "אירעה שגיאה. נסה שוב.";
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
}
