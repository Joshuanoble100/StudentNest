import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { getMyRoommateProfile, upsertRoommateProfile } from "@/lib/services/roommate.service";
import { roommateProfileSchema } from "@/lib/validation/roommate";

export const dynamic = "force-dynamic";

/** GET /api/roommates/profile — the caller's own roommate profile, or null. */
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getMyRoommateProfile(user.id));
  } catch (error) {
    return handleRouteError(error, "GET /api/roommates/profile");
  }
}

/** PUT /api/roommates/profile — create or replace the caller's roommate profile. */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:roommates:profile`, {
      max: 20,
      windowSeconds: 60,
    });

    const parsed = roommateProfileSchema.parse(await request.json());
    return ok(await upsertRoommateProfile(user.id, parsed), 201);
  } catch (error) {
    return handleRouteError(error, "PUT /api/roommates/profile");
  }
}
