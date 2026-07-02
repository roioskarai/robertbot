import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";

type Ctx = { params: { id: string } };

// POST /api/conversations/[id]/return — hand the conversation back to the bot
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();

  // Ownership via the bot relation — defense-in-depth on top of RLS.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, bots!inner(user_id)")
    .eq("id", params.id)
    .maybeSingle();
  if (!conv || (conv as { bots?: { user_id?: string } }).bots?.user_id !== session.authId) {
    return jsonError("השיחה לא נמצאה", 404);
  }

  const { data, error } = await supabase
    .from("conversations")
    .update({ status: "bot" })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, conversation: data });
}
