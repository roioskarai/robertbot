import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";

type Ctx = { params: { id: string } };

// POST /api/bots/[id]/activate  body: { active?: boolean }  (default true)
export async function POST(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let active = true;
  try {
    const body = await req.json();
    if (typeof body?.active === "boolean") active = body.active;
  } catch {
    /* default true */
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("bots")
    .update({ active })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, bot: data });
}
