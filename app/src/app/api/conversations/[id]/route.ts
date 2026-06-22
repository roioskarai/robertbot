import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";

type Ctx = { params: { id: string } };

// GET /api/conversations/[id] — conversation + its messages
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*, bots(name, bot_name, whatsapp_number)")
    .eq("id", params.id)
    .maybeSingle();
  if (error) {
    console.error("[conversation GET] db error:", error.message);
    return jsonError("טעינת השיחה נכשלה. נסה שוב.", 500);
  }
  if (!conversation) return jsonError("השיחה לא נמצאה", 404);

  const { data: messages, error: mErr } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });
  if (mErr) {
    console.error("[conversation GET] messages error:", mErr.message);
    return jsonError("טעינת ההודעות נכשלה. נסה שוב.", 500);
  }

  return NextResponse.json({ conversation, messages: messages ?? [] });
}
