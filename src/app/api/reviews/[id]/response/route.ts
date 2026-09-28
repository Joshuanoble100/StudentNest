import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { upsertLandlordResponse } from "@/lib/services/review.service";
import { landlordResponseSchema } from "@/lib/validation/review";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/[id]/response — the property owner publishes a response.
 * Owners may respond to reviews; they can never delete or edit them.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:review-response`, { max: 20, windowSeconds: 3600 });

    const { id } = await context.params;
    const body = await request.json();
    const input = landlordResponseSchema.parse(body);

    const response = await upsertLandlordResponse({ id: user.id }, id, input.body);
    return ok({ id: response.id, updatedAt: response.updatedAt });
  } catch (error) {
    return handleRouteError(error, "reviews:response");
  }
}
