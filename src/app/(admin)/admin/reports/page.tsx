import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { listReports, listReviewReports } from "@/lib/services/report.service";
import { PageHeader } from "@/components/account/page-header";
import { AdminAction } from "@/components/admin/admin-action";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_TARGET_LABELS } from "@/lib/constants";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Reports", robots: { index: false } };

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
] as const;

const KIND_TABS = [
  { value: "generic", label: "Listings, users & messages" },
  { value: "review", label: "Reviews" },
] as const;

const STATUS_VARIANT: Record<string, "pending" | "info" | "verified" | "neutral"> = {
  OPEN: "pending",
  UNDER_REVIEW: "info",
  RESOLVED: "verified",
  DISMISSED: "neutral",
};

const reasonLabel = (reason: string) =>
  REPORT_REASON_LABELS[reason as keyof typeof REPORT_REASON_LABELS] ?? reason.replace(/_/g, " ");

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; status?: string; targetId?: string; page?: string }>;
}) {
  await requireRolePage("ADMIN");
  const params = await searchParams;
  const kind = params.kind === "review" ? "review" : "generic";
  const status = STATUS_TABS.some((t) => t.value === params.status) ? (params.status ?? "") : "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  // Deep links from the users/listings panels narrow to one target.
  const targetId = kind === "generic" ? params.targetId?.slice(0, 64) : undefined;

  const result =
    kind === "review"
      ? await listReviewReports({ status: status || undefined, page })
      : await listReports({ status: status || undefined, targetId, page });

  const hrefFor = (next: number) => {
    const query = new URLSearchParams({ kind });
    if (status) query.set("status", status);
    if (targetId) query.set("targetId", targetId);
    if (next > 1) query.set("page", String(next));
    return `/admin/reports?${query.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description={`${result.total} report${result.total === 1 ? "" : "s"} filed by users${targetId ? " against this target" : ""}.`}
      />

      {targetId && (
        <Link
          href={kind === "review" ? "/admin/reports?kind=review" : "/admin/reports"}
          className="mb-4 inline-block text-sm font-medium text-brand-700 hover:underline"
        >
          Clear target filter
        </Link>
      )}

      <Alert variant="info" className="mb-5">
        <AlertTitle>Reports are claims, not verdicts</AlertTitle>
        <p className="text-sm">
          A report tells you to look — it does not tell you what you will find. Check the target
          yourself before acting, and record what you found. Dismissing a false report is a normal
          outcome; ignoring a real scam is not.
        </p>
      </Alert>

      <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Report type">
        {KIND_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "generic" ? "/admin/reports" : "/admin/reports?kind=review"}
            aria-current={kind === tab.value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              kind === tab.value ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Filter reports by status">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/reports?kind=${kind}${tab.value ? `&status=${tab.value}` : ""}`}
            aria-current={status === tab.value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === tab.value ? "bg-slate-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={<Flag className="h-9 w-9" aria-hidden />} title="No reports match this filter" />
      ) : (
        <ul className="space-y-3">
          {kind === "review"
            ? (result.items as Awaited<ReturnType<typeof listReviewReports>>["items"]).map((report) => (
                <li key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <ReportHeader
                    status={report.status}
                    createdAt={report.createdAt}
                    handledAt={report.handledAt}
                    handledBy={report.handledById ? "a moderator" : null}
                    anonymous={report.anonymous}
                  />
                  <p className="mt-2 text-sm">
                    <span className="font-semibold text-slate-900">{reasonLabel(report.reason)}</span>
                    {report.details && <span className="text-slate-600"> — {report.details}</span>}
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <Link href={`/admin/reviews?id=${report.review.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                      {report.review.property.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {report.review.overallRating}/5 · by {report.review.author.name} · currently{" "}
                      {report.review.status.replace("_", " ").toLowerCase()}
                    </p>
                    {report.review.body && (
                      <p className="mt-1 line-clamp-3 text-sm text-slate-700">{report.review.body}</p>
                    )}
                  </div>
                  <ReportActions reportId={report.id} status={report.status} kind="review" resolution={report.resolution} />
                </li>
              ))
            : (result.items as Awaited<ReturnType<typeof listReports>>["items"]).map((report) => (
                <li key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <ReportHeader
                    status={report.status}
                    createdAt={report.createdAt}
                    handledAt={report.handledAt}
                    handledBy={report.handledBy?.name ?? null}
                    anonymous={report.anonymous}
                    reporter={report.reporter ? `${report.reporter.name} (${report.reporter.email})` : null}
                  />
                  <p className="mt-2 text-sm">
                    <span className="font-semibold text-slate-900">{reasonLabel(report.reason)}</span>
                    {report.details && <span className="text-slate-600"> — {report.details}</span>}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Against{" "}
                    <span className="font-medium">
                      {REPORT_TARGET_LABELS[report.targetType as keyof typeof REPORT_TARGET_LABELS] ?? report.targetType}
                    </span>{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">{report.targetId.slice(0, 8)}…</code>
                    <ReportTargetLink targetType={report.targetType} targetId={report.targetId} />
                  </p>
                  {report.resolution && (
                    <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                      <span className="font-semibold">Resolution: </span>
                      {report.resolution}
                    </p>
                  )}
                  <ReportActions reportId={report.id} status={report.status} kind="generic" resolution={report.resolution} />
                </li>
              ))}
        </ul>
      )}

      {result.totalPages > 1 && <Pagination page={page} totalPages={result.totalPages} hrefFor={hrefFor} />}
    </div>
  );
}

function ReportHeader({
  status,
  createdAt,
  handledAt,
  handledBy,
  anonymous,
  reporter,
}: {
  status: string;
  createdAt: Date;
  handledAt: Date | null;
  handledBy: string | null;
  anonymous: boolean;
  reporter?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="text-xs text-slate-500">
        Filed {timeAgo(createdAt)} ({formatDate(createdAt)})
        {anonymous ? " · anonymously" : reporter ? ` · by ${reporter}` : ""}
        {handledAt && handledBy ? ` · handled by ${handledBy} on ${formatDate(handledAt)}` : ""}
      </p>
      <Badge variant={STATUS_VARIANT[status] ?? "neutral"}>
        {REPORT_STATUS_LABELS[status as keyof typeof REPORT_STATUS_LABELS] ?? status}
      </Badge>
    </div>
  );
}

/** Best-effort deep link to the reported entity. */
function ReportTargetLink({ targetType, targetId }: { targetType: string; targetId: string }) {
  if (targetType === "PROPERTY") {
    return (
      <>
        {" · "}
        <Link href={`/admin/properties?id=${targetId}`} className="font-medium text-brand-700 hover:underline">
          Open listing
        </Link>
      </>
    );
  }
  if (targetType === "USER") {
    return (
      <>
        {" · "}
        <Link href={`/admin/users?id=${targetId}`} className="font-medium text-brand-700 hover:underline">
          Open user
        </Link>
      </>
    );
  }
  return null;
}

function ReportActions({
  reportId,
  status,
  kind,
  resolution,
}: {
  reportId: string;
  status: string;
  kind: "generic" | "review";
  resolution: string | null;
}) {
  const endpoint = `/api/admin/reports/${reportId}${kind === "review" ? "?kind=review" : ""}`;
  if (status === "RESOLVED" || status === "DISMISSED") {
    return (
      <p className="mt-3 text-xs text-slate-500">
        Closed{resolution ? `: ${resolution}` : ""}. Reopen by choosing an action below.
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {status === "OPEN" && (
        <AdminAction endpoint={endpoint} action="REVIEW" label="Start investigating" description="Moves it out of the open queue so another moderator does not duplicate the work." />
      )}
      <AdminAction
        endpoint={endpoint}
        action="RESOLVE"
        label="Resolve"
        requiresReason
        reasonField="resolution"
        reasonLabel="What you found and what you did"
        description="Use this when the report was valid. Say what action you took — it is the record other moderators rely on."
      />
      <AdminAction
        endpoint={endpoint}
        action="DISMISS"
        label="Dismiss"
        requiresReason
        reasonField="resolution"
        reasonLabel="Why this report is not valid"
        variant="destructive"
        description="Use this when the report is mistaken or malicious. The reporter is not told who dismissed it."
      />
    </div>
  );
}
