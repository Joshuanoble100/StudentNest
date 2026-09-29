import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { changePassword } from "@/lib/services/settings.service";
import { changePasswordSchema } from "@/lib/validation/auth";

export const dynamic = "force-dynamic";

/** POST /api/settings/password — requires the current password; never returns a hash. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    // Deliberately strict: password changes are a credential-stuffing target.
    assertRateLimit(`${clientKey(request, user.id)}:settings:password`, {
      max: 5,
      windowSeconds: 300,
    });

    const parsed = changePasswordSchema.parse(await request.json());
    return ok(await changePassword(user, parsed));
  } catch (error) {
    return handleRouteError(error, "POST /api/settings/password");
  }
}
