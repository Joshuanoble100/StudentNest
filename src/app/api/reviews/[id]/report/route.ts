import { getSessionUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { reportReview } from "@/lib/services/review.service";
import { reviewReportSchema } from "@/lib/validation/review";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/[id]/report — flag a review for moderation.
 * Reporting is allowed for signed-out and anonymous users so unsafe content can
 * always be flagged; the rate limiter keeps this from being abused.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    assertRateLimit(`${clientKey(request, user?.id)}:review-report`, { max: 10, windowSeconds: 3600 });

    const { id } = await context.params;
    const body = await request.json();
    const input = reviewReportSchema.parse(body);

    await reportReview(user ? { id: user.id } : null, id, input);
    return ok({ reported: true }, 201);
  } catch (error) {
    return handleRouteError(error, "reviews:report");
  }
}
