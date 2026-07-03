import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hebAuthError, jsonError } from "@/lib/errors";
import { isValidEmail } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`login:${clientKey(req)}`, 10, 60_000).allowed) {
    return jsonError("יותר מדי נסיונות התחברות. נסה שוב בעוד דקה.", 429);
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const { email, password } = body;
  if (!email || !password) return jsonError("חסר אימייל או סיסמה");
  if (!isValidEmail(email)) return jsonError("כתובת מייל לא תקינה");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return jsonError(hebAuthError(error.message));

  return NextResponse.json({ ok: true });
}
