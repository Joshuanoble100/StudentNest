import { requireRole, requireUser } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { listMyPayments, startCheckout } from "@/lib/services/payments.service";
import { paymentCheckoutSchema } from "@/lib/validation/payment";

export const dynamic = "force-dynamic";

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

/** GET /api/payments — the signed-in user's own charges. */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    return ok(await listMyPayments(user.id, page));
  } catch (error) {
    return handleRouteError(error, "GET /api/payments");
  }
}

/**
 * POST /api/payments — start a charge for an optional landlord extra.
 * Students are excluded: nothing a student needs is behind a payment.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole(...PROVIDER_ROLES);
    assertRateLimit(`${clientKey(request, user.id)}:payment-checkout`, { max: 10, windowSeconds: 600 });

    const input = paymentCheckoutSchema.parse(await request.json());
    const charge = await startCheckout(user, input);
    return ok(charge, 201);
  } catch (error) {
    return handleRouteError(error, "POST /api/payments");
  }
}
