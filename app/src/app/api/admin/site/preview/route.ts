import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { unauthorized } from "@/lib/errors";

// Toggle Next.js Draft Mode so the public pages render the DRAFT document.
// POST            → enable preview
// POST ?exit=1    → disable preview
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const exit = new URL(req.url).searchParams.get("exit");
  if (exit) {
    (await draftMode()).disable();
    return NextResponse.json({ ok: true, draft: false });
  }
  (await draftMode()).enable();
  return NextResponse.json({ ok: true, draft: true });
}
