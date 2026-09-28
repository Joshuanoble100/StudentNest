import { registerUser, AuthError } from "@/lib/services/auth.service";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { fail, handleRouteError, ok } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertRateLimit(`${clientKey(request)}:register`, { max: 5, windowSeconds: 600 });
    const body = await request.json();
    const user = await registerUser(body);
    return ok({ user }, 201);
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status, { code: error.code });
    return handleRouteError(error, "register");
  }
}

export const dynamic = "force-dynamic";
