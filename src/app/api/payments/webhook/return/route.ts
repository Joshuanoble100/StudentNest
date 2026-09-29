import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/webhook/return — browser landing point after Paystack
 * hosted checkout.
 *
 * This route deliberately does not mark anything as paid. It only forwards the
 * reference to the billing page, which reads the authoritative status from the
 * database (set by the verified webhook). A user could call this URL directly,
 * so trusting it would let anyone claim a purchase.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("reference") ?? "";
  const reference = /^[A-Za-z0-9_-]{6,64}$/.test(raw) ? raw : "";
  const target = reference
    ? `/dashboard/landlord/billing?reference=${encodeURIComponent(reference)}`
    : "/dashboard/landlord/billing";
  return NextResponse.redirect(new URL(target, request.url), 303);
}
