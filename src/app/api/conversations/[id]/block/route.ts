import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { setBlocked } from "@/lib/services/messaging.service";
import { blockUserSchema } from "@/lib/validation/messaging";
import { auditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/block — block or unblock the other participant.
 * Blocking stops further messages in both directions for that thread.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const input = blockUserSchema.parse({ ...body, conversationId: id });

    await setBlocked(user.id, input.conversationId, input.blocked);
    await auditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: input.blocked ? "message.block" : "message.unblock",
      entityType: "Conversation",
      entityId: input.conversationId,
    });

    return ok({ blocked: input.blocked });
  } catch (error) {
    return handleRouteError(error, "conversation:block");
  }
}
