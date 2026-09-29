import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { handleReport, handleReviewReport } from "@/lib/services/report.service";
import { reportHandlingSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reports/[id] — update a report's status.
 * `?kind=review` targets a ReviewReport; otherwise the generic Report table.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const kind = new URL(request.url).searchParams.get("kind") === "review" ? "review" : "generic";

    const body = await request.json();
    const parsed = reportHandlingSchema.parse({ ...body, reportId: id });

    if (kind === "review") {
      const updated = await handleReviewReport(admin, parsed.reportId, parsed.action, parsed.resolution);
      return ok({ id: updated.id, status: updated.status });
    }

    const updated = await handleReport(admin, parsed.reportId, parsed.action, parsed.resolution);
    return ok({ id: updated.id, status: updated.status });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/reports/[id]");
  }
}
