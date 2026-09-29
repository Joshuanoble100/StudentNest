import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { listInquiriesForOwner } from "@/lib/services/inquiry.service";
import { PageHeader } from "@/components/account/page-header";
import { InquiryResponseForm } from "@/components/property/inquiry-response-form";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from "@/lib/constants";
import { cn, formatDate, initials, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Inquiries" };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "NEW", label: "Awaiting reply" },
  { value: "RESPONDED", label: "Answered" },
  { value: "VIEWING_SCHEDULED", label: "Viewing set" },
  { value: "CLOSED", label: "Closed" },
] as const;

type BadgeVariant = "verified" | "pending" | "neutral" | "info";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  NEW: "pending",
  RESPONDED: "verified",
  VIEWING_SCHEDULED: "info",
  CLOSED: "neutral",
};

export default async function LandlordInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requireRolePage(...PROVIDER_ROLES);
  const params = await searchParams;
  const status = STATUS_FILTERS.some((f) => f.value === params.status) ? (params.status ?? "") : "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { items, total, totalPages } = await listInquiriesForOwner(user.id, status || undefined, page);
  const awaiting = items.filter((i) => i.status === "NEW").length;

  const hrefFor = (next: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (next > 1) query.set("page", String(next));
    const qs = query.toString();
    return qs ? `/dashboard/landlord/inquiries?${qs}` : "/dashboard/landlord/inquiries";
  };

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description={`${total} total${awaiting > 0 ? ` · ${awaiting} on this page still need a reply` : ""}`}
      />

      <Alert variant="info" className="mb-5">
        <p className="text-sm">
          Students cannot see your phone number and you cannot see theirs — that is deliberate.
          Keep the arrangement here until you have met in person. Your reply rate is published
          on your listings, including replies that say “no longer available”.
        </p>
      </Alert>

      <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Filter inquiries by status">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/dashboard/landlord/inquiries?status=${filter.value}` : "/dashboard/landlord/inquiries"}
            aria-current={status === filter.value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === filter.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-9 w-9" aria-hidden />}
          title="No inquiries here"
          description="When a student asks about one of your listings it will appear here and you will get a notification."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((inquiry) => (
            <li key={inquiry.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    {inquiry.student.profile?.avatarUrl ? (
                      <AvatarImage src={inquiry.student.profile.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>{initials(inquiry.student.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{inquiry.student.name}</p>
                    <Link
                      href={`/properties/${inquiry.property.slug}`}
                      className="text-sm text-brand-700 hover:underline"
                    >
                      {inquiry.property.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {INQUIRY_TYPE_LABELS[inquiry.type as keyof typeof INQUIRY_TYPE_LABELS] ?? inquiry.type} ·{" "}
                      {timeAgo(inquiry.createdAt)}
                      {inquiry.viewingDate ? ` · viewing ${formatDate(inquiry.viewingDate)}` : ""}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[inquiry.status] ?? "neutral"}>
                  {INQUIRY_STATUS_LABELS[inquiry.status as keyof typeof INQUIRY_STATUS_LABELS] ?? inquiry.status}
                </Badge>
              </div>

              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {inquiry.message}
              </p>

              {inquiry.ownerResponse && (
                <p className="mt-2 rounded-lg border-l-2 border-brand-300 bg-brand-50/50 p-3 text-sm text-slate-700">
                  <span className="font-semibold">Your reply</span>
                  {inquiry.respondedAt && (
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {formatDate(inquiry.respondedAt)}
                    </span>
                  )}
                  <span className="mt-1 block">{inquiry.ownerResponse}</span>
                </p>
              )}

              <div className="mt-3">
                <InquiryResponseForm
                  inquiryId={inquiry.id}
                  inquiryType={inquiry.type}
                  closed={inquiry.status === "CLOSED"}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />}
    </div>
  );
}
