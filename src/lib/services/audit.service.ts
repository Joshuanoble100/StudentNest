import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface AuditLogInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Records an admin/system action. Never include passwords, tokens, or
 * sensitive verification documents in metadata.
 */
export async function auditLog(entry: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? undefined,
      },
    });
  } catch (error) {
    // Audit failures must never break the primary operation, but surface in logs.
    console.error("[audit] failed to write audit log", {
      action: entry.action,
      entityType: entry.entityType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
