import { BadgeCheck, CalendarDays, ShieldQuestion } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { ReportDialog } from "@/components/report/report-dialog";
import { LandlordResponseForm } from "@/components/reviews/landlord-response-form";
import { REVIEW_VERIFICATION_LABELS } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";
import type { ReviewCategory } from "@/lib/types";

export interface ReviewCardData {
  id: string;
  overallRating: number;
  title: string | null;
  body: string;
  verification: "VERIFIED_STAY" | "VERIFIED_REVIEWER" | "UNVERIFIED";
  createdAt: string;
  dateStayedFrom: string | null;
  stayDurationMonths: number | null;
  authorName: string;
  authorAvatar: string | null;
  categoryRatings: { category: ReviewCategory; rating: number }[];
  response: { body: string } | null;
}

interface ReviewCardProps {
  review: ReviewCardData;
  categoryLabels: Record<ReviewCategory, string>;
  /** True when the signed-in viewer owns the listing being reviewed. */
  isOwner?: boolean;
}

const VERIFICATION_VARIANT = {
  VERIFIED_STAY: "verified",
  VERIFIED_REVIEWER: "info",
  UNVERIFIED: "neutral",
} as const;

export function ReviewCard({ review, categoryLabels, isOwner = false }: ReviewCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {review.authorAvatar ? <AvatarImage src={review.authorAvatar} alt="" /> : null}
            <AvatarFallback>{initials(review.authorName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-slate-900">{review.authorName}</p>
            <p className="text-xs text-slate-500">
              {formatDate(review.createdAt)}
              {review.stayDurationMonths
                ? ` · stayed ${review.stayDurationMonths} month${review.stayDurationMonths > 1 ? "s" : ""}`
                : review.dateStayedFrom
                  ? ` · stayed from ${formatDate(review.dateStayedFrom)}`
                  : ""}
            </p>
          </div>
        </div>

        <Badge
          variant={VERIFICATION_VARIANT[review.verification]}
          title={
            review.verification === "UNVERIFIED"
              ? "We found no record confirming this reviewer stayed here. The review may still be genuine."
              : review.verification === "VERIFIED_REVIEWER"
                ? "This student had a confirmed interaction with the owner (a responded inquiry or scheduled viewing)."
                : "Our team confirmed this student's stay at this property."
          }
        >
          {review.verification === "UNVERIFIED" ? (
            <ShieldQuestion className="h-3 w-3" aria-hidden />
          ) : (
            <BadgeCheck className="h-3 w-3" aria-hidden />
          )}
          {REVIEW_VERIFICATION_LABELS[review.verification]}
        </Badge>
      </header>

      <div className="mt-3 flex items-center gap-2">
        <StarRating value={review.overallRating} size="sm" showValue />
      </div>

      {review.title && <h4 className="mt-2 font-semibold text-slate-900">{review.title}</h4>}
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{review.body}</p>

      {review.categoryRatings.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {review.categoryRatings.map((rating) => (
            <li
              key={rating.category}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
            >
              {categoryLabels[rating.category]}: <strong>{rating.rating}/5</strong>
            </li>
          ))}
        </ul>
      )}

      {review.response && (
        <div className="mt-4 rounded-lg border-l-4 border-brand-300 bg-brand-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-900">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Response from the property owner
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.response.body}</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <ReportDialog
          targetType="REVIEW"
          targetId={review.id}
          endpoint={`/api/reviews/${review.id}/report`}
          label="Report review"
          variant="ghost"
          className="text-xs text-slate-500"
        />
        {isOwner && (
          <div className="min-w-0 flex-1">
            <LandlordResponseForm
              reviewId={review.id}
              initialBody={review.response?.body ?? ""}
            />
          </div>
        )}
      </div>
    </article>
  );
}
