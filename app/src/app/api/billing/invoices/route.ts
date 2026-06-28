import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";
import { getPaymentProvider, hasPayment } from "@/lib/payments";

// GET /api/billing/invoices — card on file + invoice history.
// Returns { supported:false } when the active provider can't expose this
// (e.g. Grow manages billing on its side) so the UI shows an honest empty state.
export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const provider = getPaymentProvider();
  const customerId =
    session.profile?.payment_customer_id || session.profile?.stripe_customer_id || null;

  if (!hasPayment() || !provider.getBillingInfo || !customerId) {
    return NextResponse.json({ supported: false, card: null, invoices: [] });
  }

  try {
    const info = await provider.getBillingInfo(customerId);
    return NextResponse.json(info);
  } catch (e) {
    console.error("[billing/invoices] failed:", e);
    return NextResponse.json({ supported: false, card: null, invoices: [] });
  }
}
