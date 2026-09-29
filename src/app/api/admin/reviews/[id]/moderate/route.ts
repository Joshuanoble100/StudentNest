import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { moderateReview } from "@/lib/services/review.service";
import { reviewModerationSchema } from "@/lib/validation/review";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reviews/[id]/moderate — approve, hide, reject, restore or mark disputed.
 * Hiding and rejecting require a stored reason, which is shown to the reviewer.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    assertRateLimit(`${clientKey(request, admin.id)}:admin-review`, { max: 120, windowSeconds: 300 });

    const body = await request.json();
    const parsed = reviewModerationSchema.parse({ ...body, reviewId: id });
    await moderateReview(admin, parsed.reviewId, parsed.action, parsed.reason);
    return ok({ reviewId: parsed.reviewId, action: parsed.action });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/reviews/[id]/moderate");
  }
}
