import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";

// GET /api/conversations?status=human&botId=...
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const botId = url.searchParams.get("botId");

  const supabase = createClient();
  let query = supabase
    .from("conversations")
    .select("*, bots(name, bot_name, whatsapp_number)")
    .order("last_message_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (botId) query = query.eq("bot_id", botId);

  const { data, error } = await query;
  if (error) {
    console.error("[conversations GET] db error:", error.message);
    return jsonError("טעינת השיחות נכשלה. נסה שוב.", 500);
  }
  return NextResponse.json({ conversations: data ?? [] });
}
