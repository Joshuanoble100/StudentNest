import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { requireUserPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/account/page-header";
import { MyReviewItem } from "@/components/account/my-review-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { REVIEW_STATUS_LABELS, REVIEW_VERIFICATION_LABELS, VERIFICATION_EXPLAINER } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My reviews" };

export default async function StudentReviewsPage() {
  const user = await requireUserPage("/dashboard/student/reviews");

  const reviews = await prisma.review.findMany({
    where: { authorId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      overallRating: true,
      status: true,
      verification: true,
      isEdited: true,
      moderationReason: true,
      createdAt: true,
      property: { select: { slug: true, title: true } },
      response: { where: { deletedAt: null }, select: { body: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="My reviews"
        description="Everything you have written about places you stayed. Landlords can respond publicly, but they cannot edit or delete your review."
      />

      <Alert variant="info" className="mb-5">
        {VERIFICATION_EXPLAINER}
      </Alert>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-9 w-9" aria-hidden />}
          title="You have not written a review yet"
          description="Reviews from students who actually stayed somewhere are the most useful thing on StudentNest. You can review a property from its listing page."
          action={
            <Button asChild>
              <Link href="/properties">Find a property to review</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <MyReviewItem
              key={review.id}
              review={{
                id: review.id,
                title: review.title,
                body: review.body,
                overallRating: review.overallRating,
                status: review.status,
                statusLabel: REVIEW_STATUS_LABELS[review.status] ?? review.status,
                verificationLabel: REVIEW_VERIFICATION_LABELS[review.verification],
                isEdited: review.isEdited,
                moderationReason: review.moderationReason,
                createdAt: review.createdAt.toISOString(),
                propertySlug: review.property.slug,
                propertyTitle: review.property.title,
                response: review.response?.body ?? null,
                canEdit: review.status !== "HIDDEN" && review.status !== "REJECTED",
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
