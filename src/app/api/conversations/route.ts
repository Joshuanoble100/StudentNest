import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { getOrCreateConversation, listConversations } from "@/lib/services/messaging.service";
import { startConversationSchema } from "@/lib/validation/messaging";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations — start (or resume) a conversation with another user.
 * Messages stay inside StudentNest; phone numbers are never required.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:conversation`, { max: 10, windowSeconds: 600 });

    const body = await request.json();
    const input = startConversationSchema.parse(body);
    const conversation = await getOrCreateConversation(user.id, input.recipientId, {
      propertyId: input.propertyId,
      subject: input.subject,
      firstMessage: input.firstMessage,
    });

    return ok({ id: conversation.id }, 201);
  } catch (error) {
    return handleRouteError(error, "conversations:start");
  }
}

/** GET /api/conversations — inbox for the signed-in user. */
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listConversations(user.id));
  } catch (error) {
    return handleRouteError(error, "conversations:list");
  }
}
