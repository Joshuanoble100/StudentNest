import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/account/page-header";
import { AdminAction } from "@/components/admin/admin-action";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRating } from "@/components/ui/star-rating";
import { Pagination } from "@/components/search/pagination";
import { REVIEW_STATUS_LABELS, REVIEW_VERIFICATION_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Reviews", robots: { index: false } };

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "DISPUTED", label: "Disputed" },
  { value: "PUBLISHED", label: "Published" },
  { value: "HIDDEN", label: "Hidden" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; id?: string; page?: string }>;
}) {
  await requireRolePage("ADMIN");
  const params = await searchParams;
  const status = STATUS_TABS.some((t) => t.value === params.status) ? (params.status ?? "") : "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = {
    deletedAt: null,
    ...(status ? { status: status as never } : {}),
    ...(params.id ? { id: params.id } : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        verification: true,
        overallRating: true,
        title: true,
        body: true,
        moderationReason: true,
        createdAt: true,
        moderatedAt: true,
        dateStayedFrom: true,
        stayDurationMonths: true,
        author: { select: { id: true, name: true, email: true, createdAt: true } },
        property: { select: { id: true, title: true, slug: true, owner: { select: { name: true, email: true } } } },
        categoryRatings: { select: { category: true, rating: true } },
        reports: { where: { status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { reason: true, details: true, createdAt: true } },
        response: { select: { body: true, deletedAt: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (next: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (params.id) query.set("id", params.id);
    if (next > 1) query.set("page", String(next));
    const qs = query.toString();
    return qs ? `/admin/reviews?${qs}` : "/admin/reviews";
  };

  return (
    <div>
      <PageHeader title="Reviews" description={`${total} review${total === 1 ? "" : "s"} matching this filter.`} />

      <Alert variant="warning" className="mb-5">
        <AlertTitle>Reviews are student evidence, not landlord property</AlertTitle>
        <p className="text-sm">
          Hide or reject only against a written policy reason — the reason is stored, shown to the
          reviewer, and written to the audit log. An owner disputing a negative review is not by
          itself grounds to remove it. Mark it disputed and investigate; deleting legitimate
          criticism is how a review platform loses its value.
        </p>
      </Alert>

      <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Filter reviews by status">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/reviews?status=${tab.value}` : "/admin/reviews"}
            aria-current={status === tab.value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === tab.value ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
        {params.id && (
          <Link href="/admin/reviews" className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 hover:underline">
            Clear single-review filter
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={<Star className="h-9 w-9" aria-hidden />} title="No reviews match this filter" />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const endpoint = `/api/admin/reviews/${review.id}/moderate`;
            const ownerResponse = review.response && !review.response.deletedAt ? review.response.body : null;
            return (
              <li key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/properties/${review.property.slug}`} className="text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline">
                      {review.property.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      Owner: {review.property.owner.name} · Reviewer:{" "}
                      <Link href={`/admin/users?q=${encodeURIComponent(review.author.email)}`} className="hover:underline">
                        {review.author.name}
                      </Link>{" "}
                      (joined {formatDate(review.author.createdAt)})
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Badge variant={review.status === "PUBLISHED" ? "verified" : review.status === "REJECTED" ? "rejected" : review.status === "HIDDEN" ? "neutral" : "pending"}>
                      {REVIEW_STATUS_LABELS[review.status as keyof typeof REVIEW_STATUS_LABELS] ?? review.status}
                    </Badge>
                    <Badge variant={review.verification === "UNVERIFIED" ? "outline" : "info"}>
                      {REVIEW_VERIFICATION_LABELS[review.verification as keyof typeof REVIEW_VERIFICATION_LABELS] ?? review.verification}
                    </Badge>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StarRating value={review.overallRating} showValue />
                  <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
                  {review.stayDurationMonths && (
                    <span className="text-xs text-slate-500">
                      stayed {review.stayDurationMonths} month{review.stayDurationMonths === 1 ? "" : "s"}
                      {review.dateStayedFrom ? ` from ${formatDate(review.dateStayedFrom)}` : ""}
                    </span>
                  )}
                </div>

                {review.title && <h3 className="mt-2 text-sm font-semibold text-slate-900">{review.title}</h3>}
                <p className="mt-1 text-sm text-slate-700">{review.body}</p>

                {review.categoryRatings.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {review.categoryRatings.map((rating) => (
                      <li key={rating.category} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {rating.category.replace(/_/g, " ").toLowerCase()}: {rating.rating}/5
                      </li>
                    ))}
                  </ul>
                )}

                {review.reports.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-900">
                      {review.reports.length} open report{review.reports.length === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {review.reports.map((report, index) => (
                        <li key={index} className="text-xs text-amber-900">
                          {report.reason.replace(/_/g, " ")}
                          {report.details ? ` — ${report.details}` : ""} ({formatDate(report.createdAt)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ownerResponse && (
                  <p className="mt-3 rounded-lg border-l-2 border-brand-300 bg-brand-50/50 p-3 text-sm text-slate-700">
                    <span className="text-xs font-semibold text-slate-900">Owner response</span>
                    <span className="mt-1 block">{ownerResponse}</span>
                  </p>
                )}

                {review.moderationReason && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold">Last moderation reason: </span>
                    {review.moderationReason}
                    {review.moderatedAt ? ` (${formatDate(review.moderatedAt)})` : ""}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {review.status !== "PUBLISHED" && (
                    <AdminAction endpoint={endpoint} action="APPROVE" label="Publish" description="Makes this review visible to all students." />
                  )}
                  {review.status !== "DISPUTED" && (
                    <AdminAction endpoint={endpoint} action="DISPUTE" label="Mark disputed" description="Flags it for investigation. It stays published while you check." />
                  )}
                  {review.status !== "HIDDEN" && (
                    <AdminAction endpoint={endpoint} action="HIDE" label="Hide" requiresReason variant="destructive" description="Removes it from public view. The reviewer is told why and can edit and resubmit." />
                  )}
                  {review.status !== "REJECTED" && (
                    <AdminAction endpoint={endpoint} action="REJECT" label="Reject" requiresReason variant="destructive" description="For reviews that break policy outright. The record is kept — nothing is deleted." />
                  )}
                  {(review.status === "HIDDEN" || review.status === "REJECTED") && (
                    <AdminAction endpoint={endpoint} action="RESTORE" label="Restore" description="Publishes it again and recalculates the property rating." />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />}
    </div>
  );
}
