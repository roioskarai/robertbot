import { NextResponse } from "next/server";

/** Maps common Supabase/auth error messages to Hebrew. */
export function hebAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already"))
    return "כתובת המייל כבר רשומה במערכת";
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "אימייל או סיסמה שגויים";
  if (m.includes("email rate limit") || m.includes("email sending") || m.includes("rate limit"))
    return "שלחנו כבר מייל לכתובת זו — בדוק את תיבת הדואר (כולל ספאם), או נסה שוב בעוד כמה דקות.";
  if (m.includes("invalid email") || m.includes("email address is invalid") || m.includes("unable to validate email"))
    return "כתובת מייל לא תקינה";
  if (m.includes("email not confirmed"))
    return "המייל טרם אומת — בדוק את תיבת הדואר שלך";
  if (m.includes("password") || m.includes("weak password"))
    return "הסיסמה אינה תקינה (לפחות 8 תווים)";
  if (m.includes("token") && m.includes("expired"))
    return "הקישור פג תוקף — בקש קישור חדש";
  if (m.includes("fetch") || m.includes("network"))
    return "החיבור לשרת נכשל — בדוק את החיבור לאינטרנט ונסה שוב";
  // Unmapped Supabase/auth error: never echo the raw provider message to the
  // client (may contain internal details) — log server-side, return generic.
  console.error("[hebAuthError] unmapped auth error:", msg);
  return "אירעה שגיאה. נסה שוב.";
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
}
