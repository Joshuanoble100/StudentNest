import { requireUser } from "@/lib/auth-helpers";
import { fail, handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import { uploadImage } from "@/lib/services/storage.service";

export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = new Set(["properties", "avatars", "verification"]);

/**
 * POST /api/upload — multipart form with a single `file` field and an optional
 * `folder`. Size and MIME type are enforced inside the storage layer before any
 * bytes are written; the folder is allow-listed so a caller cannot write to an
 * arbitrary path.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertRateLimit(`${clientKey(request, user.id)}:upload`, { max: 30, windowSeconds: 600 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("No file was uploaded", 400);

    const requested = typeof form.get("folder") === "string" ? (form.get("folder") as string) : "properties";
    const folder = ALLOWED_FOLDERS.has(requested) ? requested : "properties";

    // Verification documents are identity evidence: stored privately and served
    // only through the admin-gated, audited /api/documents route.
    const visibility = folder === "verification" ? "private" : "public";

    const result = await uploadImage(file, `${folder}/${user.id}`, visibility);
    return ok(result, 201);
  } catch (error) {
    return handleRouteError(error, "POST /api/upload");
  }
}
