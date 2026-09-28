import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { toggleFavorite } from "@/lib/services/property.service";
import { uuidSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

/** POST /api/favorites — toggles a property in the signed-in user's favorites. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:favorites`, { max: 60, windowSeconds: 60 });

    const body = await request.json().catch(() => ({}));
    const propertyId = uuidSchema.parse(body?.propertyId);
    const result = await toggleFavorite(user.id, propertyId);
    return ok(result);
  } catch (error) {
    return handleRouteError(error, "favorites");
  }
}
