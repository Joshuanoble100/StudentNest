import { requestPasswordReset } from "@/lib/services/auth.service";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { handleRouteError, ok } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertRateLimit(`${clientKey(request)}:forgot`, { max: 3, windowSeconds: 600 });
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);
    // Always returns success to avoid email enumeration.
    await requestPasswordReset(email);
    return ok({
      message: "If that email has an account, a reset link is on its way.",
    });
  } catch (error) {
    return handleRouteError(error, "forgot-password");
  }
}

export const dynamic = "force-dynamic";
