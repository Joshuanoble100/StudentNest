import { requireUser } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { completeMockPayment } from "@/lib/services/payments.service";
import { mockCompleteSchema } from "@/lib/validation/payment";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/mock/complete — development shortcut.
 * The service refuses to run when NODE_ENV=production, so this route cannot be
 * used to grant paid features on a live deployment.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:payment-mock`, { max: 20, windowSeconds: 600 });

    const { reference } = mockCompleteSchema.parse(await request.json());
    return ok(await completeMockPayment(user.id, reference));
  } catch (error) {
    return handleRouteError(error, "POST /api/payments/mock/complete");
  }
}
