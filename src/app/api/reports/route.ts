import { getSessionUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { fileReport } from "@/lib/services/report.service";
import { reportSchema } from "@/lib/validation/messaging";
import { auditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports — report a property, user, message or conversation.
 * Anonymous reports are allowed; every report is stored with a reason and
 * reviewed by admins. Reports never auto-remove content.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    assertRateLimit(`${clientKey(request, user?.id)}:report`, { max: 10, windowSeconds: 3600 });

    const body = await request.json();
    const input = reportSchema.parse(body);
    const report = await fileReport(user ? { id: user.id } : null, input);

    await auditLog({
      actorId: input.anonymous ? null : (user?.id ?? null),
      actorEmail: input.anonymous ? null : (user?.email ?? null),
      action: "report.create",
      entityType: input.targetType,
      entityId: input.targetId,
      metadata: { reason: input.reason, anonymous: input.anonymous, reportId: report.id },
    });

    return ok({ id: report.id, status: report.status }, 201);
  } catch (error) {
    return handleRouteError(error, "reports:create");
  }
}
