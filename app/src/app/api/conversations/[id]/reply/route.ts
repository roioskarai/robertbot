import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { hasTwilioCreds, sendWhatsApp } from "@/lib/twilio";

type Ctx = { params: { id: string } };

// POST /api/conversations/[id]/reply  body: { body } — human agent reply
export async function POST(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let payload: { body?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const text = (payload.body || "").trim();
  if (!text) return jsonError("הודעה ריקה");

  const supabase = createClient();
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (convErr) return jsonError(convErr.message, 500);
  if (!conv) return jsonError("השיחה לא נמצאה", 404);

  // Persist the human message and mark conversation as human-handled.
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({ conversation_id: params.id, from_type: "human", body: text })
    .select("*")
    .single();
  if (msgErr) return jsonError(msgErr.message, 500);

  await supabase
    .from("conversations")
    .update({ status: "human", last_message_at: new Date().toISOString() })
    .eq("id", params.id);

  // Deliver to the customer over WhatsApp (best-effort).
  if (hasTwilioCreds()) {
    try {
      await sendWhatsApp(conv.customer_phone, text);
    } catch {
      /* delivery failure shouldn't drop the saved message */
    }
  }

  return NextResponse.json({ ok: true, message: msg });
}
