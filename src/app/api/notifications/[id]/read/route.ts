import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { markNotificationRead } from "@/lib/services/notification.service";
import { uuidSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

/** POST /api/notifications/[id]/read — marks one of the caller's notifications read. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    assertRateLimit(`${clientKey(request, user.id)}:notifications:read`, {
      max: 120,
      windowSeconds: 60,
    });

    await markNotificationRead(user.id, uuidSchema.parse(id));
    return ok({ read: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/notifications/[id]/read");
  }
}
