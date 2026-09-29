import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { handleRouteError } from "@/lib/api";
import { readPrivateDocument } from "@/lib/services/storage.service";
import { auditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents/[...path] — serves a private verification document.
 *
 * Admin-only and audited: every time an admin opens a document we record it, so
 * access to sensitive identity material is never silent. Documents are stored
 * outside the public upload directory and have no unauthenticated URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const admin = await requireRole("ADMIN");
    const { path } = await params;
    const objectPath = path.join("/");

    const document = await readPrivateDocument(objectPath);
    if (!document) return NextResponse.json({ error: { message: "Document not found" } }, { status: 404 });

    await auditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "verification.document_view",
      entityType: "VerificationDocument",
      entityId: objectPath,
    });

    return new NextResponse(new Uint8Array(document.bytes), {
      headers: {
        "Content-Type": document.contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/documents/[...path]");
  }
}
