import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { toggleFavoriteRoommate } from "@/lib/services/roommate.service";
import { uuidSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

/** POST /api/roommates/[id]/favorite — toggles a saved roommate profile. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    assertRateLimit(`${clientKey(request, user.id)}:roommates:favorite`, {
      max: 60,
      windowSeconds: 60,
    });

    return ok(await toggleFavoriteRoommate(user.id, uuidSchema.parse(id)));
  } catch (error) {
    return handleRouteError(error, "POST /api/roommates/[id]/favorite");
  }
}
