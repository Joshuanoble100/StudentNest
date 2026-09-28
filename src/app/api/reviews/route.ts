import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { createReview } from "@/lib/services/review.service";
import { reviewCreateSchema } from "@/lib/validation/review";
import { uuidSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

const bodySchema = reviewCreateSchema.extend({ propertyId: uuidSchema });

/**
 * POST /api/reviews — a student publishes a review.
 * Verification level (VERIFIED_STAY / VERIFIED_REVIEWER / UNVERIFIED) is decided
 * server-side from real records; it is never taken from the request.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:review`, { max: 5, windowSeconds: 3600 });

    const body = await request.json();
    const input = bodySchema.parse(body);
    const { propertyId, ...reviewInput } = input;

    const review = await createReview(user, propertyId, reviewInput);
    return ok({ id: review.id, verification: review.verification, status: review.status }, 201);
  } catch (error) {
    return handleRouteError(error, "reviews:create");
  }
}
