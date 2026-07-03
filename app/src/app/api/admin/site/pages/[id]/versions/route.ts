import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unauthorized } from "@/lib/errors";
import { requirePermission } from "@/lib/site/permissions";

// GET → version history for a page (newest first)
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePermission("content.read");
  if (!session) return unauthorized();
  const db = createAdminClient();
  const { data } = await db
    .from("page_versions")
    .select("id, label, created_by, created_at")
    .eq("page_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ versions: data ?? [] });
}
