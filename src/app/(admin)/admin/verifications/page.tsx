import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/account/page-header";
import { AdminAction } from "@/components/admin/admin-action";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_TYPE_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Verifications", robots: { index: false } };

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
] as const;

type SubmittedData = {
  fullName?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
} | null;

const asSubmittedData = (value: unknown): SubmittedData =>
  value && typeof value === "object" ? (value as SubmittedData) : null;

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireRolePage("ADMIN");
  const params = await searchParams;
  const status = STATUS_TABS.some((t) => t.value === params.status) ? (params.status ?? "") : "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const PAGE_SIZE = 20;

  const where = { ...(status ? { status: status as never } : {}) };
  const [requests, total] = await Promise.all([
    prisma.verificationRequest.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
            _count: { select: { ownedProperties: true } },
          },
        },
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.verificationRequest.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (next: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (next > 1) query.set("page", String(next));
    const qs = query.toString();
    return qs ? `/admin/verifications?${qs}` : "/admin/verifications";
  };

  return (
    <div>
      <PageHeader
        title="Verification requests"
        description={`${total} request${total === 1 ? "" : "s"} from landlords and agents.`}
      />

      <Alert variant="danger" className="mb-5">
        <AlertTitle>You are looking at private identity documents</AlertTitle>
        <p className="text-sm">
          These files are stored outside the public upload directory and are served only through
          this admin-only, audited route — every document you open is recorded against your
          account. Never copy them elsewhere, never attach them to a public listing, and never
          approve on the strength of a name alone: open the document and check it matches.
        </p>
      </Alert>

      <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Filter requests by status">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/verifications?status=${tab.value}` : "/admin/verifications"}
            aria-current={status === tab.value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === tab.value ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-9 w-9" aria-hidden />} title="No verification requests" />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const submitted = asSubmittedData(request.submittedData);
            const endpoint = `/api/admin/verifications/${request.id}`;
            return (
              <li key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{request.user.name}</p>
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(request.user.email)}`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      {request.user.email}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {VERIFICATION_TYPE_LABELS[request.type as keyof typeof VERIFICATION_TYPE_LABELS] ?? request.type} ·{" "}
                      submitted {formatDate(request.createdAt)} · {request.user._count.ownedProperties} listing
                      {request.user._count.ownedProperties === 1 ? "" : "s"}
                      {request.user.status !== "ACTIVE" && (
                        <span className="text-red-600"> · account {request.user.status.toLowerCase()}</span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={
                      request.status === "VERIFIED"
                        ? "verified"
                        : request.status === "PENDING"
                          ? "pending"
                          : "rejected"
                    }
                  >
                    {VERIFICATION_STATUS_LABELS[request.status as keyof typeof VERIFICATION_STATUS_LABELS] ?? request.status}
                  </Badge>
                </div>

                {(submitted?.fullName || submitted?.documentNumber || submitted?.notes) && (
                  <dl className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-3">
                    {submitted?.fullName && (
                      <div>
                        <dt className="font-semibold text-slate-500">Name on document</dt>
                        <dd className="text-slate-800">{submitted.fullName}</dd>
                      </div>
                    )}
                    {submitted?.documentNumber && (
                      <div>
                        <dt className="font-semibold text-slate-500">Document number</dt>
                        <dd className="text-slate-800">{submitted.documentNumber}</dd>
                      </div>
                    )}
                    {submitted?.notes && (
                      <div>
                        <dt className="font-semibold text-slate-500">Their note</dt>
                        <dd className="text-slate-800">{submitted.notes}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">
                    Attached documents ({request.documentUrls.length})
                  </p>
                  {request.documentUrls.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Nothing attached. Reject and ask them to resubmit with documents — do not
                      approve an empty request.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {request.documentUrls.map((url, index) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                            Open document {index + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {request.rejectionReason && (
                  <p className="mt-3 rounded bg-red-50 p-2 text-xs text-red-800">
                    <span className="font-semibold">Previous rejection reason: </span>
                    {request.rejectionReason}
                    {request.reviewedBy ? ` · decided by ${request.reviewedBy.name}` : ""}
                    {request.reviewedAt ? ` on ${formatDate(request.reviewedAt)}` : ""}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {request.status === "PENDING" ? (
                    <>
                      <AdminAction
                        endpoint={endpoint}
                        body={{ decision: "VERIFIED" }}
                        action="APPROVE"
                        label="Approve"
                        description="Grants the public verified badge. Only do this after opening the documents and confirming they match the account."
                      />
                      <AdminAction
                        endpoint={endpoint}
                        body={{ decision: "REJECTED" }}
                        action="REJECT"
                        label="Reject"
                        requiresReason
                        reasonField="rejectionReason"
                        reasonLabel="Why this was rejected (sent to the applicant)"
                        variant="destructive"
                        description="Tell them exactly what to fix — an unreadable photo, a name mismatch, a missing page."
                      />
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Already decided. A new decision overwrites the previous one and notifies the
                      applicant again.
                    </p>
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
