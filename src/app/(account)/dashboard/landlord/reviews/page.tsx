import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/account/page-header";
import { LandlordResponseForm } from "@/components/reviews/landlord-response-form";
import { StarRating } from "@/components/ui/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { REVIEW_STATUS_LABELS, REVIEW_VERIFICATION_LABELS } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reviews of my listings" };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

const STATUS_VARIANT: Record<string, "verified" | "pending" | "rejected" | "neutral"> = {
  PUBLISHED: "verified",
  UNDER_REVIEW: "pending",
  DISPUTED: "pending",
  HIDDEN: "neutral",
  REJECTED: "rejected",
};

export default async function LandlordReviewsPage() {
  const user = await requireRolePage(...PROVIDER_ROLES);

  const reviews = await prisma.review.findMany({
    where: { property: { ownerId: user.id }, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      overallRating: true,
      title: true,
      body: true,
      status: true,
      verification: true,
      moderationReason: true,
      createdAt: true,
      isEdited: true,
      author: { select: { name: true, profile: { select: { avatarUrl: true } } } },
      property: { select: { title: true, slug: true } },
      response: { select: { body: true, createdAt: true, deletedAt: true } },
    },
  });

  const published = reviews.filter((r) => r.status === "PUBLISHED");
  const average =
    published.length > 0
      ? published.reduce((sum, r) => sum + r.overallRating, 0) / published.length
      : null;

  return (
    <div>
      <PageHeader
        title="Reviews of my listings"
        description="What students who stayed in your properties actually said."
      />

      <Alert variant="info" className="mb-5">
        <AlertTitle>You can respond, but you cannot remove a review</AlertTitle>
        <p className="text-sm">
          Your response is public and appears directly under the review. If a review is false or
          abusive, report it — our moderation team will assess it against our policy and record
          a reason for any action. We do not delete legitimate negative feedback, and a disputed
          review stays visible while it is being checked.
        </p>
      </Alert>

      {average !== null && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <StarRating value={average} showValue count={published.length} size="lg" />
          <p className="text-sm text-slate-500">
            Calculated from published reviews only. Hidden or disputed reviews are excluded until
            moderation finishes.
          </p>
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-9 w-9" aria-hidden />}
          title="No reviews yet"
          description="Students can review a property after they have stayed there. Reviews from verified stays are labelled so other students know they are first-hand."
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const response = review.response && !review.response.deletedAt ? review.response : null;
            return (
            <li key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    {review.author.profile?.avatarUrl ? (
                      <AvatarImage src={review.author.profile.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>{initials(review.author.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{review.author.name}</p>
                    <Link
                      href={`/properties/${review.property.slug}`}
                      className="text-sm text-brand-700 hover:underline"
                    >
                      {review.property.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(review.createdAt)}
                      {review.isEdited ? " · edited by the student" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Badge variant={STATUS_VARIANT[review.status] ?? "neutral"}>
                    {REVIEW_STATUS_LABELS[review.status as keyof typeof REVIEW_STATUS_LABELS] ?? review.status}
                  </Badge>
                  <Badge variant={review.verification === "UNVERIFIED" ? "neutral" : "info"}>
                    {REVIEW_VERIFICATION_LABELS[review.verification as keyof typeof REVIEW_VERIFICATION_LABELS] ?? review.verification}
                  </Badge>
                </div>
              </div>

              <div className="mt-3">
                <StarRating value={review.overallRating} />
              </div>

              {review.title && <h3 className="mt-2 text-sm font-semibold text-slate-900">{review.title}</h3>}
              {review.body && <p className="mt-1 text-sm text-slate-700">{review.body}</p>}

              {review.status === "HIDDEN" && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-semibold">Hidden by moderation. </span>
                  {review.moderationReason ?? "No reason was recorded."}{" "}
                  It is not visible to students right now. The review has not been deleted and the
                  student was notified.
                </p>
              )}
              {review.status === "UNDER_REVIEW" && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                  Being checked by our moderation team — not published yet. You can still write a
                  response and it will appear once the review is published.
                </p>
              )}

              {response ? (
                <div className="mt-3 rounded-lg border-l-2 border-brand-300 bg-brand-50/50 p-3">
                  <p className="text-xs font-semibold text-slate-900">
                    Your response
                    <span className="ml-1 font-normal text-slate-500">
                      {formatDate(response.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{response.body}</p>
                  <div className="mt-2">
                    <LandlordResponseForm reviewId={review.id} initialBody={response.body} />
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <LandlordResponseForm reviewId={review.id} initialBody="" />
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
