import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/errors";
import { extractBusinessKnowledge } from "@/lib/agents/knowledge";

export const dynamic = "force-dynamic";

// POST /api/agents/knowledge — interactive product agent.
// Tenant-facing (auth required). Body: { text, businessType?, businessName? }.
// Returns drafted { description, services, faq } for the owner to edit during
// onboarding. Suggestion-only — it does not save anything.
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let body: { text?: string; businessType?: string; businessName?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  if (!body.text || !body.text.trim()) {
    return jsonError("חסר תיאור עסק לניתוח");
  }

  try {
    const result = await extractBusinessKnowledge({
      text: body.text,
      businessType: body.businessType,
      businessName: body.businessName,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "ניתוח הידע נכשל", 500);
  }
}
