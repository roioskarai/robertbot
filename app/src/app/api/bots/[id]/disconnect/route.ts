import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/disconnect — detach WhatsApp number, deactivate
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("bots")
    .update({ whatsapp_number: null, active: false })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, bot: data });
}
