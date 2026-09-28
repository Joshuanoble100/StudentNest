import { requireUser } from "@/lib/auth-helpers";
import { ok, handleRouteError } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
} from "@/lib/services/saved-search.service";
import { uuidSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

/** GET /api/saved-searches — the signed-in user's saved searches. */
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listSavedSearches(user.id));
  } catch (error) {
    return handleRouteError(error, "saved-searches:list");
  }
}

/** POST /api/saved-searches — save the current filter query. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:saved-search`, { max: 20, windowSeconds: 300 });
    const body = await request.json();
    return ok(await createSavedSearch(user.id, body), 201);
  } catch (error) {
    return handleRouteError(error, "saved-searches:create");
  }
}

/** DELETE /api/saved-searches?id=… */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const id = uuidSchema.parse(new URL(request.url).searchParams.get("id"));
    await deleteSavedSearch(user.id, id);
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "saved-searches:delete");
  }
}
