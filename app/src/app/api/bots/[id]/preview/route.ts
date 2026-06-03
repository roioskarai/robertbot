import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { generateReply, hasAnthropicKey, type HistoryMessage } from "@/lib/claude";
import { jsonError } from "@/lib/errors";
import type { Bot } from "@/lib/types";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/preview
// body: { message, history?, bot? }
// `bot` (inline config) lets the onboarding preview run on an unsaved draft.
export async function POST(req: Request, { params }: Ctx) {
  let body: { message?: string; history?: HistoryMessage[]; bot?: Bot };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }

  const message = (body.message || "").trim();
  if (!message) return jsonError("הודעה ריקה");

  if (!hasAnthropicKey()) {
    return NextResponse.json(
      { error: "מנוע ה-AI אינו פעיל — הגדר ANTHROPIC_API_KEY", noKey: true },
      { status: 503 },
    );
  }

  let bot = body.bot;
  if (!bot) {
    // Load a saved bot — requires auth.
    const session = await getSessionUser();
    if (!session) return jsonError("לא מחובר", 401);
    const supabase = createClient();
    const { data } = await supabase
      .from("bots")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (!data) return jsonError("הבוט לא נמצא", 404);
    bot = data as Bot;
  }

  try {
    const reply = await generateReply(bot, body.history ?? [], message);
    return NextResponse.json(reply);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "שגיאת מנוע AI", 502);
  }
}
