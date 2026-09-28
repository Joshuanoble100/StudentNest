import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { getConversation } from "@/lib/services/messaging.service";

export const dynamic = "force-dynamic";

/** GET /api/conversations/[id] — thread with participants and messages. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await getConversation(user.id, id));
  } catch (error) {
    return handleRouteError(error, "conversation:get");
  }
}
