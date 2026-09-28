import { prisma } from "@/lib/prisma";
import type { ReviewCreateInput } from "@/lib/validation/review";
import type { InquiryStatus, ReviewVerification } from "@prisma/client";
import { auditLog } from "./audit.service";
import { createNotification } from "./notification.service";

export class ReviewError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Determines the honest verification level for a review.
 * - VERIFIED_STAY: granted only by admin confirmation (or a future booking
 *   system). NEVER auto-assigned here.
 * - VERIFIED_REVIEWER: the student has a confirmed interaction with the
 *   property owner (an inquiry the owner responded to, or a scheduled/closed
 *   viewing) — evidence of genuine engagement, not a guaranteed stay.
 * - UNVERIFIED: no supporting interaction found.
 */
async function determineVerification(
  studentId: string,
  propertyId: string,
  inquiryId?: string,
): Promise<ReviewVerification> {
  const inquiryWhere = inquiryId
    ? { id: inquiryId, studentId, propertyId }
    : { studentId, propertyId, status: { in: ["RESPONDED", "VIEWING_SCHEDULED", "CLOSED"] as InquiryStatus[] } };
  const confirmed = await prisma.inquiry.findFirst({ where: inquiryWhere, select: { id: true } });
  return confirmed ? "VERIFIED_REVIEWER" : "UNVERIFIED";
}

function stayKeyFrom(input: ReviewCreateInput): string {
  if (input.dateStayedFrom) {
    const d = new Date(input.dateStayedFrom);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return "main";
}

export async function createReview(
  author: { id: string; email: string; role: string },
  propertyId: string,
  input: ReviewCreateInput,
) {
  if (author.role !== "STUDENT") {
    throw new ReviewError("Only student accounts can review properties", 403);
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, status: true, deletedAt: true, ownerId: true, slug: true, title: true },
  });
  if (!property || property.deletedAt || property.status !== "ACTIVE") {
    throw new ReviewError("Property not found", 404);
  }
  if (property.ownerId === author.id) {
    throw new ReviewError("You cannot review your own listing", 403);
  }

  const stayKey = stayKeyFrom(input);
  const existing = await prisma.review.findUnique({
    where: {
      propertyId_authorId_stayKey: { propertyId, authorId: author.id, stayKey },
    },
    select: { id: true },
  });
  if (existing) {
    throw new ReviewError(
      "You already reviewed this property for the same stay period. Edit your existing review instead.",
      409,
    );
  }

  const verification = await determineVerification(author.id, propertyId, input.inquiryId);

  // Publication policy, disclosed to students in the review form:
  // reviews backed by a confirmed stay or a confirmed interaction with the
  // owner publish immediately; unverified reviews are checked by a moderator
  // first so fake reviews cannot go straight onto a listing.
  const status = verification === "UNVERIFIED" ? "UNDER_REVIEW" : "PUBLISHED";

  const review = await prisma.review.create({
    data: {
      propertyId,
      authorId: author.id,
      overallRating: input.overallRating,
      title: input.title ?? null,
      body: input.body,
      photos: input.photos,
      stayKey,
      dateStayedFrom: input.dateStayedFrom ?? null,
      dateStayedTo: input.dateStayedTo ?? null,
      stayDurationMonths: input.stayDurationMonths ?? null,
      status,
      verification,
      categoryRatings: {
        create: input.categoryRatings.map((cr) => ({
          category: cr.category,
          rating: cr.rating,
        })),
      },
    },
    select: { id: true, status: true, verification: true },
  });

  if (status === "PUBLISHED") await recomputePropertyRating(propertyId);

  await createNotification({
    userId: property.ownerId,
    type: "REVIEW_RECEIVED",
    title: "New review submitted",
    body:
      status === "PUBLISHED"
        ? `A student published a review for "${property.title}". You can respond publicly.`
        : `A student submitted a review for "${property.title}". It will appear after moderation.`,
    link: "/dashboard/landlord/reviews",
  });

  await auditLog({
    actorId: author.id,
    actorEmail: author.email,
    action: "review.create",
    entityType: "Review",
    entityId: review.id,
    metadata: { propertyId, verification },
  });

  return review;
}

/** Author edits their own review under controlled rules. Content is replaced, never silently. */
export async function updateReview(
  authorId: string,
  reviewId: string,
  input: Partial<ReviewCreateInput>,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, authorId: true, status: true, deletedAt: true, propertyId: true },
  });
  if (!review || review.deletedAt) throw new ReviewError("Review not found", 404);
  if (review.authorId !== authorId) throw new ReviewError("Not your review", 403);
  if (review.status === "HIDDEN" || review.status === "REJECTED") {
    throw new ReviewError("This review was moderated and can no longer be edited", 403);
  }

  const wasPublished = review.status === "PUBLISHED";

  const updated = await prisma.$transaction(async (tx) => {
    if (input.categoryRatings) {
      await tx.reviewCategoryRating.deleteMany({ where: { reviewId } });
      await tx.reviewCategoryRating.createMany({
        data: input.categoryRatings.map((cr) => ({
          reviewId,
          category: cr.category,
          rating: cr.rating,
        })),
      });
    }
    return tx.review.update({
      where: { id: reviewId },
      data: {
        overallRating: input.overallRating ?? undefined,
        title: input.title ?? undefined,
        body: input.body ?? undefined,
        photos: input.photos ?? undefined,
        dateStayedFrom: input.dateStayedFrom ?? undefined,
        dateStayedTo: input.dateStayedTo ?? undefined,
        stayDurationMonths: input.stayDurationMonths ?? undefined,
        isEdited: true,
        editedAt: new Date(),
        // Published reviews stay published but visibly marked as edited.
        status: wasPublished ? "PUBLISHED" : "UNDER_REVIEW",
      },
    });
  });

  if (wasPublished) await recomputePropertyRating(review.propertyId);
  return updated;
}

/** Recomputes denormalized rating aggregates from PUBLISHED reviews only. */
export async function recomputePropertyRating(propertyId: string) {
  const agg = await prisma.review.aggregate({
    where: { propertyId, status: "PUBLISHED", deletedAt: null },
    _avg: { overallRating: true },
    _count: { id: true },
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      avgRating: agg._avg.overallRating ?? 0,
      reviewCount: agg._count.id,
    },
  });
}

export type ModerationAction = "APPROVE" | "HIDE" | "REJECT" | "RESTORE" | "DISPUTE";

export async function moderateReview(
  admin: { id: string; email: string },
  reviewId: string,
  action: ModerationAction,
  reason?: string,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, propertyId: true, authorId: true },
  });
  if (!review) throw new ReviewError("Review not found", 404);

  const statusMap: Record<ModerationAction, "PUBLISHED" | "HIDDEN" | "REJECTED" | "DISPUTED"> = {
    APPROVE: "PUBLISHED",
    RESTORE: "PUBLISHED",
    HIDE: "HIDDEN",
    REJECT: "REJECTED",
    DISPUTE: "DISPUTED",
  };

  // Hiding/rejecting requires a stored reason — never silent moderation.
  if ((action === "HIDE" || action === "REJECT") && !reason?.trim()) {
    throw new ReviewError("A reason is required to hide or reject a review");
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: statusMap[action],
      moderationReason: reason ?? null,
      moderatedById: admin.id,
      moderatedAt: new Date(),
    },
  });

  await recomputePropertyRating(review.propertyId);

  await createNotification({
    userId: review.authorId,
    type: "ACCOUNT_ALERT",
    title: `Your review was ${action === "APPROVE" || action === "RESTORE" ? "published" : action.toLowerCase()}`,
    body: reason ? `Moderator note: ${reason}` : undefined,
    link: "/dashboard/student/reviews",
  });

  await auditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `review.moderate.${action.toLowerCase()}`,
    entityType: "Review",
    entityId: reviewId,
    metadata: { reason: reason ?? null, previousStatus: review.status },
  });
}

export async function reportReview(
  reporter: { id: string } | null,
  reviewId: string,
  input: { reason: string; details?: string; anonymous?: boolean },
) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) throw new ReviewError("Review not found", 404);

  return prisma.reviewReport.create({
    data: {
      reviewId,
      reason: input.reason as never,
      details: input.details ?? null,
      reporterId: input.anonymous ? null : (reporter?.id ?? null),
      anonymous: input.anonymous ?? false,
    },
  });
}

/** Property owner posts/updates a public response. Owners can never delete reviews. */
export async function upsertLandlordResponse(
  owner: { id: string },
  reviewId: string,
  body: string,
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { property: { select: { ownerId: true, title: true } } },
  });
  if (!review) throw new ReviewError("Review not found", 404);
  if (review.property.ownerId !== owner.id) {
    throw new ReviewError("You can only respond to reviews on your own listings", 403);
  }
  if (review.status !== "PUBLISHED") {
    throw new ReviewError("You can only respond to published reviews");
  }

  const response = await prisma.landlordResponse.upsert({
    where: { reviewId },
    create: { reviewId, authorId: owner.id, body },
    update: { body, updatedAt: new Date(), deletedAt: null },
  });

  await createNotification({
    userId: review.authorId,
    type: "REVIEW_RESPONSE",
    title: "The property owner responded to your review",
    body: review.property.title,
    link: `/dashboard/student/reviews`,
  });

  return response;
}

export async function listPropertyReviews(propertyId: string, page = 1, pageSize = 10) {
  const where = { propertyId, status: "PUBLISHED" as const, deletedAt: null };
  const [items, total, breakdown] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
        categoryRatings: true,
        response: { where: { deletedAt: null } },
      },
    }),
    prisma.review.count({ where }),
    prisma.reviewCategoryRating.groupBy({
      by: ["category"],
      where: { review: { propertyId, status: "PUBLISHED", deletedAt: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);
  return { items, total, page, pageSize, categoryAverages: breakdown };
}
