import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auditLog } from "./audit.service";
import { createNotification } from "./notification.service";

export class VerificationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type PropertyModerationAction =
  | "APPROVE" | "REJECT" | "SUSPEND" | "RESTORE" | "FEATURE" | "UNFEATURE" | "DELETE";

/** Admin moderation of a listing (approval workflow). */
export async function moderateProperty(
  admin: { id: string; email: string },
  propertyId: string,
  action: PropertyModerationAction,
  reason?: string,
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, ownerId: true, status: true, title: true, slug: true },
  });
  if (!property) throw new VerificationError("Property not found", 404);

  switch (action) {
    case "APPROVE":
      await prisma.property.update({
        where: { id: propertyId },
        data: { status: "ACTIVE" },
      });
      await createNotification({
        userId: property.ownerId,
        type: "LISTING_APPROVED",
        title: "Your listing is live",
        body: `"${property.title}" was approved and is now visible to students.`,
        link: `/properties/${property.slug}`,
      });
      break;
    case "REJECT":
      if (!reason?.trim()) throw new VerificationError("A reason is required to reject a listing");
      await prisma.property.update({
        where: { id: propertyId },
        data: { status: "REJECTED" },
      });
      await createNotification({
        userId: property.ownerId,
        type: "LISTING_REJECTED",
        title: "Your listing was rejected",
        body: `"${property.title}": ${reason}`,
        link: "/dashboard/landlord/properties",
      });
      break;
    case "SUSPEND":
      await prisma.property.update({
        where: { id: propertyId },
        data: { status: "SUSPENDED", verificationStatus: "SUSPENDED" },
      });
      await createNotification({
        userId: property.ownerId,
        type: "LISTING_REJECTED",
        title: "Your listing was suspended",
        body: `"${property.title}" was suspended${reason ? `: ${reason}` : ""}. Contact support if you believe this is an error.`,
        link: "/dashboard/landlord/properties",
      });
      break;
    case "RESTORE":
      await prisma.property.update({
        where: { id: propertyId },
        data: { status: "ACTIVE", deletedAt: null },
      });
      break;
    case "FEATURE":
      await prisma.property.update({
        where: { id: propertyId },
        data: { isFeatured: true, featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      });
      break;
    case "UNFEATURE":
      await prisma.property.update({
        where: { id: propertyId },
        data: { isFeatured: false, featuredUntil: null },
      });
      break;
    case "DELETE":
      await prisma.property.update({
        where: { id: propertyId },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      break;
  }

  await auditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `property.${action.toLowerCase()}`,
    entityType: "Property",
    entityId: propertyId,
    metadata: { reason: reason ?? null, previousStatus: property.status },
  });

  return prisma.property.findUnique({ where: { id: propertyId } });
}

/** Admin property verification decision. */
export async function decidePropertyVerification(
  admin: { id: string; email: string },
  propertyId: string,
  decision: "VERIFIED" | "REJECTED",
  opts: { evidenceNote?: string; rejectionReason?: string } = {},
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, ownerId: true, title: true },
  });
  if (!property) throw new VerificationError("Property not found", 404);
  if (decision === "REJECTED" && !opts.rejectionReason?.trim()) {
    throw new VerificationError("A rejection reason is required");
  }

  const latest = await prisma.propertyVerification.findFirst({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });

  await prisma.$transaction([
    ...(latest
      ? [prisma.propertyVerification.update({
          where: { id: latest.id },
          data: {
            status: decision,
            reviewedById: admin.id,
            reviewedAt: new Date(),
            evidenceNote: opts.evidenceNote ?? null,
            rejectionReason: opts.rejectionReason ?? null,
          },
        })]
      : [prisma.propertyVerification.create({
          data: {
            propertyId,
            status: decision,
            submittedById: property.ownerId,
            reviewedById: admin.id,
            reviewedAt: new Date(),
            evidenceNote: opts.evidenceNote ?? null,
            rejectionReason: opts.rejectionReason ?? null,
          },
        })]),
    prisma.property.update({
      where: { id: propertyId },
      data: { verificationStatus: decision },
    }),
  ]);

  await createNotification({
    userId: property.ownerId,
    type: "VERIFICATION_STATUS",
    title: decision === "VERIFIED" ? "Your property is now verified" : "Verification rejected",
    body:
      decision === "VERIFIED"
        ? `"${property.title}" passed verification and now shows the verified badge.`
        : `"${property.title}": ${opts.rejectionReason}`,
    link: "/dashboard/landlord/verification",
  });

  await auditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `property.verification.${decision.toLowerCase()}`,
    entityType: "Property",
    entityId: propertyId,
    metadata: { evidenceNote: opts.evidenceNote ?? null, rejectionReason: opts.rejectionReason ?? null },
  });
}

/** Landlord/agent submits identity or ownership verification. */
export async function submitVerificationRequest(
  userId: string,
  input: { type: "IDENTITY" | "OWNERSHIP" | "AGENCY_LICENSE"; submittedData?: Record<string, unknown>; documentUrls?: string[] },
) {
  const pending = await prisma.verificationRequest.findFirst({
    where: { userId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) throw new VerificationError("You already have a pending verification request", 409);

  return prisma.verificationRequest.create({
    data: {
      userId,
      type: input.type,
      submittedData: (input.submittedData ?? undefined) as Prisma.InputJsonValue | undefined,
      documentUrls: input.documentUrls ?? [],
    },
  });
}

/** Admin decision on an account verification request. Sensitive data stays private. */
export async function decideAccountVerification(
  admin: { id: string; email: string },
  requestId: string,
  decision: "VERIFIED" | "REJECTED",
  rejectionReason?: string,
) {
  const request = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new VerificationError("Verification request not found", 404);
  if (request.status !== "PENDING") throw new VerificationError("This request was already decided", 409);
  if (decision === "REJECTED" && !rejectionReason?.trim()) {
    throw new VerificationError("A rejection reason is required");
  }

  await prisma.verificationRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason ?? null,
    },
  });

  await createNotification({
    userId: request.userId,
    type: "VERIFICATION_STATUS",
    title: decision === "VERIFIED" ? "Account verified" : "Verification rejected",
    body: decision === "VERIFIED"
      ? `Your ${request.type.toLowerCase().replace("_", " ")} verification was approved.`
      : rejectionReason,
    link: "/dashboard/landlord/verification",
  });

  await auditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `account.verification.${decision.toLowerCase()}`,
    entityType: "VerificationRequest",
    entityId: requestId,
    metadata: { type: request.type, rejectionReason: rejectionReason ?? null },
  });
}

/**
 * The requesting user's own verification history.
 * Document URLs are returned only to their owner — admins get them through a
 * separate, audited path. Nobody else ever sees them.
 */
export async function listMyVerificationRequests(userId: string) {
  const requests = await prisma.verificationRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      rejectionReason: true,
      documentUrls: true,
      submittedData: true,
      reviewedBy: { select: { name: true } },
    },
  });
  return { requests, isVerified: await isUserVerified(userId) };
}

/** Whether a landlord/agent user has an approved identity verification. */
export async function isUserVerified(userId: string): Promise<boolean> {
  const approved = await prisma.verificationRequest.findFirst({
    where: { userId, status: "VERIFIED", type: { in: ["IDENTITY", "AGENCY_LICENSE"] } },
    select: { id: true },
  });
  return Boolean(approved);
}
