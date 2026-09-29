import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { createProperty, listOwnerProperties } from "@/lib/services/property.service";
import { propertyCreateSchema } from "@/lib/validation/property";

export const dynamic = "force-dynamic";

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

/** GET /api/properties?status=… — the signed-in provider's own listings. */
export async function GET(request: Request) {
  try {
    const user = await requireRole(...PROVIDER_ROLES);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const items = await listOwnerProperties(user.id, status);
    return ok({ items });
  } catch (error) {
    return handleRouteError(error, "GET /api/properties");
  }
}

/**
 * POST /api/properties — create a listing.
 * New listings land in PENDING_REVIEW (or DRAFT); they never go straight to
 * ACTIVE, so nothing is published without moderation.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole(...PROVIDER_ROLES);
    assertRateLimit(`${clientKey(request, user.id)}:property-create`, { max: 10, windowSeconds: 600 });

    const input = propertyCreateSchema.parse(await request.json());
    const property = await createProperty(user.id, user.email, input);
    return ok(property, 201);
  } catch (error) {
    return handleRouteError(error, "POST /api/properties");
  }
}
