import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider, hasPayment } from "@/lib/payments";
import { parseProduct } from "@/lib/plans";
import { jsonError, unauthorized } from "@/lib/errors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST /api/billing/checkout  body: { product: "pro_monthly" | "pack_regular" | ... }
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  if (!hasPayment()) return jsonError("סליקה אינה זמינה כרגע", 503);

  let body: { product?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("בקשה לא תקינה");
  }
  const parsed = body.product ? parseProduct(body.product) : null;
  if (!parsed) return jsonError("מוצר לא חוקי");

  // Store access rule: packs are for active subscribers only.
  if (parsed.kind === "pack" && session.profile?.subscription_status !== "active") {
    return jsonError("רכישת Packs זמינה למנויים פעילים בלבד", 403);
  }

  const provider = getPaymentProvider();
  const supabase = createClient();

  try {
    const out = await provider.createCheckout({
      userId: session.authId,
      email: session.email,
      product: body.product!,
      kind: parsed.kind,
      plan: parsed.kind === "plan" ? parsed.plan : undefined,
      cycle: parsed.kind === "plan" ? parsed.cycle : undefined,
      pack: parsed.kind === "pack" ? parsed.pack : undefined,
      customerId: session.profile?.payment_customer_id ?? session.profile?.stripe_customer_id,
      successUrl: `${APP_URL}/dashboard?checkout=success`,
      cancelUrl: `${APP_URL}/dashboard?checkout=cancel`,
    });

    // Persist a newly created provider customer id, if any.
    if (out.customerId) {
      await supabase
        .from("users")
        .update({ payment_provider: provider.id, payment_customer_id: out.customerId })
        .eq("id", session.authId);
    }

    return NextResponse.json({ url: out.url });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "פתיחת התשלום נכשלה", 502);
  }
}
