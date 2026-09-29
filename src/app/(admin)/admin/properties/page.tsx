import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/account/page-header";
import { AdminAction } from "@/components/admin/admin-action";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import {
  PROPERTY_STATUS_LABELS,
  PROVIDER_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@/lib/constants";
import { cn, formatDate, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Listings", robots: { index: false } };

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "ACTIVE", label: "Live" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DRAFT", label: "Drafts" },
] as const;

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; id?: string; ownerId?: string; area?: string; page?: string }>;
}) {
  await requireRolePage("ADMIN");
  const params = await searchParams;
  const status = STATUS_TABS.some((t) => t.value === params.status) ? (params.status ?? "") : "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const area = (params.area ?? "").trim().slice(0, 80);

  const where = {
    ...(status ? { status: status as never } : { status: { not: "DELETED" as const } }),
    ...(params.id ? { id: params.id } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(area ? { areaName: { contains: area, mode: "insensitive" as const } } : {}),
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        verificationStatus: true,
        providerType: true,
        rentAmount: true,
        areaName: true,
        city: true,
        createdAt: true,
        viewCount: true,
        inquiryCount: true,
        reviewCount: true,
        isFeatured: true,
        images: { where: { isCover: true }, take: 1, select: { url: true, thumbUrl: true, alt: true } },
        owner: { select: { id: true, name: true, email: true, role: true, status: true } },
        university: { select: { shortName: true } },
        verifications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, rejectionReason: true, evidenceNote: true, reviewedAt: true },
        },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (next: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (params.id) query.set("id", params.id);
    if (params.ownerId) query.set("ownerId", params.ownerId);
    if (next > 1) query.set("page", String(next));
    const qs = query.toString();
    return qs ? `/admin/properties?${qs}` : "/admin/properties";
  };

  return (
    <div>
      <PageHeader
        title="Listings"
        description={`${total} listing${total === 1 ? "" : "s"}. Approving makes a listing visible to every student.`}
      />

      <Alert variant="info" className="mb-5">
        <p className="text-sm">
          Check the photos against the description and confirm every charge is disclosed before
          approving. Verification is a separate decision from approval: approving publishes the
          listing, verifying adds a trust badge that claims we checked the owner&rsquo;s evidence.
          Do not verify without evidence.
        </p>
      </Alert>

      <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Filter listings by status">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/properties?status=${tab.value}` : "/admin/properties"}
            aria-current={status === tab.value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === tab.value ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
        {(params.id || params.ownerId) && (
          <Link href="/admin/properties" className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 hover:underline">
            Clear {params.ownerId ? "owner" : "single-listing"} filter
          </Link>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState icon={<Building2 className="h-9 w-9" aria-hidden />} title="No listings match this filter" />
      ) : (
        <ul className="space-y-3">
          {properties.map((property) => {
            const cover = property.images[0];
            const endpoint = `/api/admin/properties/${property.id}/moderate`;
            return (
              <li key={property.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-32">
                    {cover ? (
                      <Image src={cover.thumbUrl ?? cover.url} alt={cover.alt ?? property.title} fill sizes="128px" className="object-cover" unoptimized />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-slate-400">No photo</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/properties/${property.slug}`} className="text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline">
                          {property.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {property.areaName}, {property.city}
                          {property.university ? ` · ${property.university.shortName}` : ""} ·{" "}
                          {formatNaira(property.rentAmount)} · submitted {formatDate(property.createdAt)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <Link href={`/admin/users?q=${encodeURIComponent(property.owner.email)}`} className="hover:underline">
                            {property.owner.name}
                          </Link>{" "}
                          ({PROVIDER_TYPE_LABELS[property.providerType as keyof typeof PROVIDER_TYPE_LABELS] ?? property.providerType})
                          {property.owner.status !== "ACTIVE" && <span className="text-red-600"> · account {property.owner.status.toLowerCase()}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <Badge variant={property.status === "ACTIVE" ? "verified" : property.status === "PENDING_REVIEW" ? "pending" : property.status === "REJECTED" || property.status === "SUSPENDED" ? "rejected" : "neutral"}>
                          {PROPERTY_STATUS_LABELS[property.status as keyof typeof PROPERTY_STATUS_LABELS] ?? property.status}
                        </Badge>
                        <Badge variant={property.verificationStatus === "VERIFIED" ? "verified" : "neutral"}>
                          <ShieldCheck className="h-3 w-3" aria-hidden />
                          {VERIFICATION_STATUS_LABELS[property.verificationStatus as keyof typeof VERIFICATION_STATUS_LABELS] ?? property.verificationStatus}
                        </Badge>
                      </div>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {property.viewCount} views · {property.inquiryCount} inquiries ·{" "}
                      {property.reviewCount} review{property.reviewCount === 1 ? "" : "s"}
                    </p>

                    {property.verifications[0]?.evidenceNote && (
                      <p className="mt-2 rounded bg-emerald-50 p-2 text-xs text-emerald-900">
                        <span className="font-semibold">Evidence note: </span>
                        {property.verifications[0].evidenceNote}
                      </p>
                    )}
                    {property.verifications[0]?.rejectionReason && (
                      <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">
                        <span className="font-semibold">Previous rejection: </span>
                        {property.verifications[0].rejectionReason}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {property.status !== "ACTIVE" && (
                        <AdminAction
                          endpoint={endpoint}
                          action="APPROVE"
                          label="Approve & publish"
                          description="This makes the listing visible to all students immediately."
                        />
                      )}
                      {property.status !== "REJECTED" && (
                        <AdminAction
                          endpoint={endpoint}
                          action="REJECT"
                          label="Reject"
                          requiresReason
                          variant="destructive"
                          description="The owner sees this reason and can fix the listing and resubmit."
                        />
                      )}
                      {property.status === "ACTIVE" && (
                        <AdminAction
                          endpoint={endpoint}
                          action="SUSPEND"
                          label="Suspend"
                          requiresReason
                          variant="destructive"
                          description="Removes it from search without deleting it or its reviews."
                        />
                      )}
                      {(property.status === "SUSPENDED" || property.status === "REJECTED") && (
                        <AdminAction endpoint={endpoint} action="RESTORE" label="Restore to live" />
                      )}
                      {property.verificationStatus === "VERIFIED" ? (
                        <AdminAction
                          endpoint={`/api/admin/properties/${property.id}/verify`}
                          body={{ decision: "REJECTED" }}
                          action="REVOKE"
                          label="Revoke verified badge"
                          requiresReason
                          reasonField="rejectionReason"
                          variant="destructive"
                        />
                      ) : (
                        <AdminAction
                          endpoint={`/api/admin/properties/${property.id}/verify`}
                          body={{ decision: "VERIFIED" }}
                          action="VERIFY"
                          label="Mark verified"
                          reasonField="evidenceNote"
                          reasonLabel="Evidence note (what you checked)"
                          description="Only do this if you have actually confirmed the listing with the owner and seen supporting evidence. The badge is a public claim."
                        />
                      )}
                      {property.isFeatured ? (
                        <AdminAction endpoint={endpoint} action="UNFEATURE" label="Remove feature" />
                      ) : (
                        <AdminAction endpoint={endpoint} action="FEATURE" label="Feature" description="Pins the listing in search for 30 days. Use sparingly — featuring is a claim of quality." />
                      )}
                      <AdminAction endpoint={endpoint} action="DELETE" label="Delete" variant="destructive" description="Soft-deletes the listing. Reviews stay on record." />
                    </div>
                  </div>
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
