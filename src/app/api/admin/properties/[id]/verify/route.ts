import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { decidePropertyVerification } from "@/lib/services/verification.service";
import { propertyVerificationSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/properties/[id]/verify — grant or refuse the verified badge.
 * A rejection reason is mandatory; the badge is never granted by default.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    assertRateLimit(`${clientKey(request, admin.id)}:admin-verify-property`, { max: 60, windowSeconds: 300 });

    const body = await request.json();
    const parsed = propertyVerificationSchema.parse({ ...body, propertyId: id });
    await decidePropertyVerification(admin, parsed.propertyId, parsed.decision, {
      evidenceNote: parsed.evidenceNote,
      rejectionReason: parsed.rejectionReason,
    });
    return ok({ propertyId: parsed.propertyId, decision: parsed.decision });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/properties/[id]/verify");
  }
}
