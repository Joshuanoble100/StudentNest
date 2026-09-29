import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FileText, Home as HomeIcon } from "lucide-react";
import { requireUserPage } from "@/lib/auth-helpers";
import { listInquiriesForStudent } from "@/lib/services/inquiry.service";
import { PageHeader } from "@/components/account/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My inquiries" };

function statusVariant(status: keyof typeof INQUIRY_STATUS_LABELS) {
  if (status === "NEW") return "pending" as const;
  if (status === "CLOSED") return "neutral" as const;
  return "verified" as const;
}

export default async function StudentInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUserPage("/dashboard/student/inquiries");
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const { items, total, totalPages } = await listInquiriesForStudent(user.id, page);

  const hrefFor = (next: number) =>
    next === 1 ? "/dashboard/student/inquiries" : `/dashboard/student/inquiries?page=${next}`;

  return (
    <div>
      <PageHeader
        title="My inquiries"
        description="Questions and viewing requests you sent. Replies arrive here and in your notifications — phone numbers are never exchanged."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-9 w-9" aria-hidden />}
          title="No inquiries yet"
          description="Open any listing and use “Send inquiry” to ask about availability, total cost, distance or to request a viewing."
          action={
            <Button asChild>
              <Link href="/properties">Find housing</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((inquiry) => {
              const cover = inquiry.property.images[0];
              return (
                <li
                  key={inquiry.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="flex gap-4 p-4">
                    <Link
                      href={`/properties/${inquiry.property.slug}`}
                      className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:block"
                      aria-label={`View ${inquiry.property.title}`}
                    >
                      {cover ? (
                        <Image
                          src={cover.thumbUrl ?? cover.url}
                          alt=""
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-slate-300">
                          <HomeIcon className="h-6 w-6" aria-hidden />
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/properties/${inquiry.property.slug}`}
                            className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                          >
                            {inquiry.property.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {INQUIRY_TYPE_LABELS[inquiry.type]} · sent {formatDateTime(inquiry.createdAt)}
                          </p>
                        </div>
                        <Badge variant={statusVariant(inquiry.status)}>
                          {INQUIRY_STATUS_LABELS[inquiry.status]}
                        </Badge>
                      </div>

                      <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                        {inquiry.message}
                      </p>

                      {inquiry.ownerResponse ? (
                        <div className="mt-2 rounded-lg border-l-4 border-brand-600 bg-brand-50/60 p-3">
                          <p className="text-xs font-semibold text-brand-800">
                            Reply from the owner
                            {inquiry.respondedAt && (
                              <span className="font-normal"> · {formatDate(inquiry.respondedAt)}</span>
                            )}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                            {inquiry.ownerResponse}
                          </p>
                          {inquiry.viewingDate && (
                            <p className="mt-2 text-xs font-semibold text-slate-700">
                              Viewing scheduled for {formatDateTime(inquiry.viewingDate)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          No reply yet. You will be notified the moment the owner responds.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
          <p className="mt-4 text-center text-xs text-slate-400">{total} inquiries</p>
        </>
      )}
    </div>
  );
}
