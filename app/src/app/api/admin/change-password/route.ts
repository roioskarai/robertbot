import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { requireAdmin } from "@/lib/admin-auth";

// POST /api/admin/change-password  { currentPassword, newPassword }
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("אין הרשאת אדמין", 403);

  let body: { currentPassword?: string; newPassword?: string };
  try { body = await req.json(); } catch { return jsonError("בקשה לא תקינה"); }
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) return jsonError("חסרים שדות");
  if (newPassword.length < 8) return jsonError("הסיסמה החדשה חייבת להכיל לפחות 8 תווים");

  // Verify current password by re-signing in.
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: session.email, password: currentPassword,
  });
  if (signInErr) return jsonError("הסיסמה הנוכחית שגויה", 401);

  // Update via service-role so we don't need email re-confirm.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(session.authId, { password: newPassword });
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}
