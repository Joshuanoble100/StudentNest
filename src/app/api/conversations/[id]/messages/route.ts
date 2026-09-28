import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { sendMessage } from "@/lib/services/messaging.service";
import { messageSchema } from "@/lib/validation/messaging";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/messages — send a message.
 * Rate limited per user to curb spam and harassment.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:message`, { max: 20, windowSeconds: 60 });

    const { id } = await context.params;
    const body = await request.json();
    const input = messageSchema.parse(body);
    const message = await sendMessage(user.id, id, input.body);
    return ok({ id: message.id, createdAt: message.createdAt }, 201);
  } catch (error) {
    return handleRouteError(error, "conversation:message");
  }
}
