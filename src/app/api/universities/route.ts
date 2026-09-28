import { prisma } from "@/lib/prisma";
import { ok, handleRouteError } from "@/lib/api";

export const revalidate = 300;

/**
 * GET /api/universities?withCampuses=true
 * Public reference data for registration/search forms.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const withCampuses = searchParams.get("withCampuses") === "true";

    const universities = await prisma.university.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        city: true,
        state: true,
        ...(withCampuses
          ? { campuses: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } } }
          : {}),
      },
    });

    return ok(universities);
  } catch (error) {
    return handleRouteError(error, "universities");
  }
}
