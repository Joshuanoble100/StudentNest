import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { listNotifications } from "@/lib/services/notification.service";
import { paginationSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

/** GET /api/notifications?page=&pageSize= — the signed-in user's notifications. */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:notifications:list`, {
      max: 60,
      windowSeconds: 60,
    });

    const url = new URL(request.url);
    const { page, pageSize } = paginationSchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? 20,
    });

    const result = await listNotifications(user.id, page, pageSize);
    return ok(result);
  } catch (error) {
    return handleRouteError(error, "GET /api/notifications");
  }
}
