import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { markAllNotificationsRead } from "@/lib/services/notification.service";

export const dynamic = "force-dynamic";

/** POST /api/notifications/read-all — marks every notification of the caller read. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:notifications:read-all`, {
      max: 20,
      windowSeconds: 60,
    });

    await markAllNotificationsRead(user.id);
    return ok({ read: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/notifications/read-all");
  }
}
