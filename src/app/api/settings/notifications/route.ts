import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { updateNotificationPreferences } from "@/lib/services/settings.service";
import { notificationPreferenceSchema } from "@/lib/validation/auth";

export const dynamic = "force-dynamic";

/** PATCH /api/settings/notifications — per-category email/push opt-in flags. */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:settings:notifications`, {
      max: 20,
      windowSeconds: 60,
    });

    const parsed = notificationPreferenceSchema.parse(await request.json());
    return ok(await updateNotificationPreferences(user, parsed));
  } catch (error) {
    return handleRouteError(error, "PATCH /api/settings/notifications");
  }
}
