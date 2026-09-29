import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { getAccountSettings, updateProfile } from "@/lib/services/settings.service";
import { profileUpdateSchema } from "@/lib/validation/auth";

export const dynamic = "force-dynamic";

/** GET /api/settings/profile — the caller's editable profile. */
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getAccountSettings(user.id));
  } catch (error) {
    return handleRouteError(error, "GET /api/settings/profile");
  }
}

/** PATCH /api/settings/profile — updates display name, phone, bio and school details. */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:settings:profile`, {
      max: 20,
      windowSeconds: 60,
    });

    const parsed = profileUpdateSchema.parse(await request.json());
    return ok(await updateProfile(user, parsed));
  } catch (error) {
    return handleRouteError(error, "PATCH /api/settings/profile");
  }
}
