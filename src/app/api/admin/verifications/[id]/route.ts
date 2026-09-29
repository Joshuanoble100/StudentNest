import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { decideAccountVerification } from "@/lib/services/verification.service";
import { accountVerificationSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

/** POST /api/admin/verifications/[id] — approve or reject an identity/ownership request. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    assertRateLimit(`${clientKey(request, admin.id)}:admin-verify-account`, { max: 60, windowSeconds: 300 });

    const body = await request.json();
    const parsed = accountVerificationSchema.parse({ ...body, requestId: id });
    await decideAccountVerification(admin, parsed.requestId, parsed.decision, parsed.rejectionReason);
    return ok({ requestId: parsed.requestId, decision: parsed.decision });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/verifications/[id]");
  }
}
