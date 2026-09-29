import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { moderateUser } from "@/lib/services/admin.service";
import { userModerationSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

/** POST /api/admin/users/[id]/moderate — suspend, reactivate, promote, demote or delete. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    assertRateLimit(`${clientKey(request, admin.id)}:admin-user`, { max: 60, windowSeconds: 300 });

    const body = await request.json();
    const parsed = userModerationSchema.parse({ ...body, userId: id });
    await moderateUser(admin, parsed.userId, parsed.action, parsed.reason);
    return ok({ userId: parsed.userId, action: parsed.action });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/users/[id]/moderate");
  }
}
