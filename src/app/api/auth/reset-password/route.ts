import { resetPassword, AuthError } from "@/lib/services/auth.service";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { fail, handleRouteError, ok } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertRateLimit(`${clientKey(request)}:reset`, { max: 5, windowSeconds: 600 });
    const body = await request.json();
    await resetPassword(body);
    return ok({ message: "Password updated. You can log in with your new password." });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleRouteError(error, "reset-password");
  }
}

export const dynamic = "force-dynamic";
