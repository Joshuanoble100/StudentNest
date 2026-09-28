import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { respondToInquiry } from "@/lib/services/inquiry.service";
import { inquiryResponseSchema } from "@/lib/validation/messaging";
import { auditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

/** POST /api/inquiries/[id] — owner responds, schedules a viewing, or closes. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:inquiry-response`, { max: 30, windowSeconds: 600 });

    const { id } = await context.params;
    const body = await request.json();
    const input = inquiryResponseSchema.parse({ ...body, inquiryId: id });

    const inquiry = await respondToInquiry({ id: user.id }, {
      inquiryId: input.inquiryId,
      status: input.status,
      response: input.response,
      viewingDate: input.viewingDate ?? null,
    });

    await auditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: `inquiry.${input.status.toLowerCase()}`,
      entityType: "Inquiry",
      entityId: inquiry.id,
    });

    return ok({ id: inquiry.id, status: inquiry.status });
  } catch (error) {
    return handleRouteError(error, "inquiries:respond");
  }
}
