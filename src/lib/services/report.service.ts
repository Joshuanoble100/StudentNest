import { prisma } from "@/lib/prisma";
import type { ReportInput } from "@/lib/validation/messaging";
import { auditLog } from "./audit.service";
import { createNotification } from "./notification.service";

export class ReportError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Files a report against a property, user, message, or conversation.
 * Review reports go through reportReview (review.service) to keep FK integrity.
 */
export async function fileReport(
  reporter: { id: string } | null,
  input: ReportInput,
) {
  if (input.targetType === "REVIEW") {
    throw new ReportError("Use the review report endpoint for reviews", 400);
  }

  // Confirm the target exists.
  let exists = false;
  switch (input.targetType) {
    case "PROPERTY":
      exists = Boolean(await prisma.property.findUnique({ where: { id: input.targetId }, select: { id: true } }));
      break;
    case "USER":
      exists = Boolean(await prisma.user.findUnique({ where: { id: input.targetId }, select: { id: true } }));
      break;
    case "MESSAGE":
      exists = Boolean(await prisma.message.findUnique({ where: { id: input.targetId }, select: { id: true } }));
      break;
    case "CONVERSATION":
      exists = Boolean(await prisma.conversation.findUnique({ where: { id: input.targetId }, select: { id: true } }));
      break;
  }
  if (!exists) throw new ReportError("Report target not found", 404);

  const report = await prisma.report.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ?? null,
      reporterId: input.anonymous ? null : (reporter?.id ?? null),
      anonymous: input.anonymous,
    },
  });

  // A property reported for scam/fake reasons gets a safety notification to admins
  // (delivered as an in-app notification to every admin user).
  if (input.reason === "SCAM" || input.reason === "FAKE_PROPERTY") {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "SUSPICIOUS_ACTIVITY",
        title: `Urgent report: ${input.reason === "SCAM" ? "possible scam" : "possible fake property"}`,
        body: `Report ${report.id.slice(0, 8)}… against ${input.targetType.toLowerCase()} ${input.targetId.slice(0, 8)}…`,
        link: "/admin/reports",
      });
    }
  }

  return report;
}

export async function handleReport(
  admin: { id: string; email: string },
  reportId: string,
  action: "REVIEW" | "RESOLVE" | "DISMISS",
  resolution?: string,
) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new ReportError("Report not found", 404);

  const status = action === "REVIEW" ? "UNDER_REVIEW" : action === "RESOLVE" ? "RESOLVED" : "DISMISSED";

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      resolution: resolution ?? null,
      handledById: admin.id,
      handledAt: new Date(),
    },
  });

  await auditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `report.${action.toLowerCase()}`,
    entityType: "Report",
    entityId: reportId,
    metadata: { targetType: report.targetType, targetId: report.targetId, resolution: resolution ?? null },
  });

  return updated;
}

export async function listReports(
  filters: { status?: string; targetType?: string; page?: number; pageSize?: number } = {},
) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const where = {
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.targetType ? { targetType: filters.targetType as never } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        handledBy: { select: { id: true, name: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
