import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { listMyVerificationRequests, submitVerificationRequest } from "@/lib/services/verification.service";
import { verificationRequestSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

/** GET /api/verification — the caller's own verification history and status. */
export async function GET() {
  try {
    const user = await requireRole(...PROVIDER_ROLES);
    return ok(await listMyVerificationRequests(user.id));
  } catch (error) {
    return handleRouteError(error, "GET /api/verification");
  }
}

/**
 * POST /api/verification — submit identity, ownership or agency-licence proof.
 * Documents are stored privately and are only ever shown to admins; a public
 * badge is granted by an admin decision, never by this request alone.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole(...PROVIDER_ROLES);
    assertRateLimit(`${clientKey(request, user.id)}:verification`, { max: 5, windowSeconds: 3600 });

    const input = verificationRequestSchema.parse(await request.json());
    const created = await submitVerificationRequest(user.id, input);
    return ok({ id: created.id, status: created.status, type: created.type }, 201);
  } catch (error) {
    return handleRouteError(error, "POST /api/verification");
  }
}
