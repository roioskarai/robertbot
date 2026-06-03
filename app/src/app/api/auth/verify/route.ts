import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hebAuthError, jsonError } from "@/lib/errors";

/** Verifies an email OTP token (Supabase email OTP). */
export async function POST(req: Request) {
  let body: { email?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const { email, token } = body;
  if (!email || !token) return jsonError("חסר אימייל או קוד");

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) return jsonError(hebAuthError(error.message));

  return NextResponse.json({ ok: true, hasSession: Boolean(data.session) });
}
