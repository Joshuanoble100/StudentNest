import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { updateReview } from "@/lib/services/review.service";
import { reviewUpdateSchema } from "@/lib/validation/review";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/reviews/[id] — the author edits their own review.
 * Moderated (HIDDEN/REJECTED) reviews cannot be edited, and the service records
 * `isEdited` so readers can see the review was changed after publication.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:review-edit`, { max: 10, windowSeconds: 3600 });

    const { id } = await context.params;
    const body = await request.json();
    const { reviewId, ...input } = reviewUpdateSchema.parse({ ...body, reviewId: id });

    const review = await updateReview(user.id, reviewId, input);
    return ok({ id: review.id, status: review.status, isEdited: review.isEdited });
  } catch (error) {
    return handleRouteError(error, "reviews:update");
  }
}
