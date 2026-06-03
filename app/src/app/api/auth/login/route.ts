import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hebAuthError, jsonError } from "@/lib/errors";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const { email, password } = body;
  if (!email || !password) return jsonError("חסר אימייל או סיסמה");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return jsonError(hebAuthError(error.message));

  return NextResponse.json({ ok: true });
}
