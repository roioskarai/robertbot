import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";
import { metaPublicConfig } from "@/lib/whatsapp/embedded-signup";

// GET /api/whatsapp/config — public (non-secret) config the browser needs to
// launch Meta Embedded Signup. appId + configId are not secrets; the app
// secret never leaves the server.
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  return NextResponse.json(metaPublicConfig());
}
