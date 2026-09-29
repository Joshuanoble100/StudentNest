import { getSessionUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { unreadNotificationCount } from "@/lib/services/notification.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/unread-count — polled by the header bell.
 * Returns a zero count (not a 401) when signed out so the poller stays quiet.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return ok({ count: 0 });
    return ok({ count: await unreadNotificationCount(user.id) });
  } catch (error) {
    return handleRouteError(error, "GET /api/notifications/unread-count");
  }
}
