import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { createInquiry, listInquiriesForStudent, listInquiriesForOwner } from "@/lib/services/inquiry.service";
import { inquirySchema } from "@/lib/validation/messaging";
import { auditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/inquiries — a student asks a question or requests a viewing.
 * Phone numbers are never exchanged here; contact stays on-platform.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:inquiry`, { max: 10, windowSeconds: 600 });

    const body = await request.json();
    const input = inquirySchema.parse(body);
    const inquiry = await createInquiry(user, {
      propertyId: input.propertyId,
      type: input.type,
      message: input.message,
      viewingDate: input.viewingDate ?? null,
    });

    await auditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "inquiry.create",
      entityType: "Inquiry",
      entityId: inquiry.id,
      metadata: { propertyId: input.propertyId, type: input.type },
    });

    return ok({ id: inquiry.id, status: inquiry.status }, 201);
  } catch (error) {
    return handleRouteError(error, "inquiries:create");
  }
}

/** GET /api/inquiries?as=owner|student — the signed-in user's inquiries. */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const as = searchParams.get("as") === "owner" ? "owner" : "student";
    const page = Number(searchParams.get("page") ?? 1) || 1;

    const result =
      as === "owner"
        ? await listInquiriesForOwner(user.id, searchParams.get("status") ?? undefined, page)
        : await listInquiriesForStudent(user.id, page);

    return ok(result);
  } catch (error) {
    return handleRouteError(error, "inquiries:list");
  }
}
