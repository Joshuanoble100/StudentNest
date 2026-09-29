import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { createCampus, createNeighborhood, createUniversity } from "@/lib/services/admin.service";
import { campusSchema, neighborhoodSchema, universitySchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reference?kind=university|campus|neighborhood
 * Creates the location reference data that search, filters and distance
 * calculations depend on. Admin-only, always audited.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireRole("ADMIN");
    assertRateLimit(`${clientKey(request, admin.id)}:admin-reference`, { max: 30, windowSeconds: 300 });

    const kind = new URL(request.url).searchParams.get("kind") ?? "university";
    const body = await request.json();

    if (kind === "campus") {
      const created = await createCampus(admin, campusSchema.parse(body));
      return ok({ id: created.id, name: created.name, slug: created.slug }, 201);
    }
    if (kind === "neighborhood") {
      const created = await createNeighborhood(admin, neighborhoodSchema.parse(body));
      return ok({ id: created.id, name: created.name, slug: created.slug }, 201);
    }

    const created = await createUniversity(admin, universitySchema.parse(body));
    return ok({ id: created.id, name: created.name, slug: created.slug }, 201);
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/reference");
  }
}
