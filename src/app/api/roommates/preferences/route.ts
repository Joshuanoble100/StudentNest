import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { updateMatchingPreference } from "@/lib/services/roommate.service";
import { roommatePreferenceSchema } from "@/lib/validation/roommate";

export const dynamic = "force-dynamic";

/**
 * PUT /api/roommates/preferences — the caller's matching weights.
 * Weights are user-owned and must sum to 100 so the score stays explainable.
 */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:roommates:preferences`, {
      max: 20,
      windowSeconds: 60,
    });

    const parsed = roommatePreferenceSchema.parse(await request.json());
    return ok(await updateMatchingPreference(user.id, parsed));
  } catch (error) {
    return handleRouteError(error, "PUT /api/roommates/preferences");
  }
}
