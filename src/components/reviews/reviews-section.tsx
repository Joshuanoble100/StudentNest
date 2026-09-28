import Link from "next/link";
import { MessageSquareWarning, Star } from "lucide-react";
import { ReviewCard, type ReviewCardData } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { Pagination } from "@/components/search/pagination";
import { StarRating } from "@/components/ui/star-rating";
import { EmptyState } from "@/components/ui/empty-state";
import { REVIEW_CATEGORY_LABELS, REVIEW_VERIFICATION_LABELS } from "@/lib/constants";
import type { ReviewCategory } from "@/lib/types";

export interface CategoryAverage {
  category: ReviewCategory;
  avg: number;
  count: number;
}

interface ReviewsSectionProps {
  reviews: ReviewCardData[];
  categoryAverages: CategoryAverage[];
  avgRating: number;
  reviewCount: number;
  total: number;
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  verificationCounts: Record<string, number>;
  viewer: { signedIn: boolean; isStudent: boolean; isOwner: boolean; hasReviewed: boolean };
  propertyId: string;
  inquiries: { id: string; label: string }[];
}

export function ReviewsSection({
  reviews,
  categoryAverages,
  avgRating,
  reviewCount,
  total,
  page,
  totalPages,
  hrefFor,
  verificationCounts,
  viewer,
  propertyId,
  inquiries,
}: ReviewsSectionProps) {
  return (
    <section id="reviews" className="scroll-mt-24" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-bold text-slate-900 sm:text-2xl">
        Student reviews
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Only published reviews are shown. Verification labels come from real records — we never
        create or upgrade them ourselves.
      </p>

      {reviewCount === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<MessageSquareWarning className="h-10 w-10" aria-hidden />}
          title="No reviews yet"
          description="Be the first student to describe what living here is really like — electricity, water, security and how the landlord or caretaker behaves."
        />
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-slate-900">{avgRating.toFixed(1)}</p>
              <div className="mt-1 flex justify-center">
                <StarRating value={avgRating} size="md" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {reviewCount} published {reviewCount === 1 ? "review" : "reviews"}
              </p>
            </div>

            <ul className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
              {Object.entries(REVIEW_VERIFICATION_LABELS).map(([key, label]) => (
                <li key={key} className="flex items-center justify-between gap-2">
                  <span>{label}</span>
                  <span className="font-semibold text-slate-900">{verificationCounts[key] ?? 0}</span>
                </li>
              ))}
            </ul>

            {categoryAverages.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Average by category
                </p>
                <ul className="space-y-2">
                  {categoryAverages.map((entry) => (
                    <li key={entry.category}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">
                          {REVIEW_CATEGORY_LABELS[entry.category]}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {entry.avg.toFixed(1)}
                          <span className="ml-1 font-normal text-slate-400">({entry.count})</span>
                        </span>
                      </div>
                      <div
                        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                        role="img"
                        aria-label={`${REVIEW_CATEGORY_LABELS[entry.category]} average ${entry.avg.toFixed(1)} out of 5`}
                      >
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${(entry.avg / 5) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                categoryLabels={REVIEW_CATEGORY_LABELS}
                isOwner={viewer.isOwner}
              />
            ))}
            <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
            <p className="text-xs text-slate-500">
              Showing page {page} of {totalPages} · {total} published {total === 1 ? "review" : "reviews"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4" id="write-review">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Star className="h-4 w-4 text-amber-500" aria-hidden />
          Write a review
        </h3>

        {viewer.isOwner ? (
          <p className="mt-2 text-sm text-slate-600">
            You own this listing, so you cannot review it. You can publish a public response to any
            review above — responses are visible to every student, and reviews cannot be deleted by
            owners.
          </p>
        ) : !viewer.signedIn ? (
          <p className="mt-2 text-sm text-slate-600">
            <Link href="/login?callbackUrl=%23write-review" className="font-semibold text-brand-700 hover:underline">
              Log in
            </Link>{" "}
            with a student account to review this property.
          </p>
        ) : !viewer.isStudent ? (
          <p className="mt-2 text-sm text-slate-600">
            Reviews are limited to student accounts so ratings reflect real residents.
          </p>
        ) : viewer.hasReviewed ? (
          <p className="mt-2 text-sm text-slate-600">
            You have already reviewed this property for this stay period. One review per stay keeps
            ratings honest — you can edit it from your{" "}
            <Link href="/dashboard/student/reviews" className="font-semibold text-brand-700 hover:underline">
              dashboard
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3">
            <ReviewForm propertyId={propertyId} inquiries={inquiries} />
          </div>
        )}
      </div>
    </section>
  );
}
