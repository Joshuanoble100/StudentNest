import { getSessionUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { listRoommates } from "@/lib/services/roommate.service";
import { roommateListSchema } from "@/lib/validation/roommate";

export const dynamic = "force-dynamic";

/**
 * GET /api/roommates — browse roommate profiles.
 *
 * Compatibility scoring only runs when the viewer is signed in AND has their
 * own profile; otherwise `compatibility` is null and the UI says so. The
 * `gender` filter is an explicit user choice and never feeds the score.
 */
export async function GET(request: Request) {
  try {
    const viewer = await getSessionUser();
    assertRateLimit(`${clientKey(request, viewer?.id ?? null)}:roommates:list`, {
      max: 60,
      windowSeconds: 60,
    });

    const url = new URL(request.url);
    const parsed = roommateListSchema.parse({
      universityId: url.searchParams.get("universityId") ?? undefined,
      budgetMin: url.searchParams.get("budgetMin") ?? undefined,
      budgetMax: url.searchParams.get("budgetMax") ?? undefined,
      smoking: url.searchParams.get("smoking") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const rawGender = url.searchParams.get("gender");
    const genderPreference =
      rawGender === "MALE" || rawGender === "FEMALE" || rawGender === "ANY"
        ? rawGender
        : undefined;

    const result = await listRoommates(viewer?.id ?? null, {
      ...parsed,
      smoking: parsed.smoking === undefined ? undefined : parsed.smoking === "true",
      genderPreference,
    });

    return ok(result);
  } catch (error) {
    return handleRouteError(error, "GET /api/roommates");
  }
}
