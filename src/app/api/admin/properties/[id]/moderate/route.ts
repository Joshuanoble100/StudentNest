import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { moderateProperty } from "@/lib/services/verification.service";
import { propertyModerationSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

/** POST /api/admin/properties/[id]/moderate — approve, reject, suspend, restore, feature, delete. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    assertRateLimit(`${clientKey(request, admin.id)}:admin-property`, { max: 120, windowSeconds: 300 });

    const body = await request.json();
    const parsed = propertyModerationSchema.parse({ ...body, propertyId: id });
    const property = await moderateProperty(admin, parsed.propertyId, parsed.action, parsed.reason);
    return ok({ id: property?.id, status: property?.status });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/properties/[id]/moderate");
  }
}
