import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FileText, PlusCircle, ShieldCheck } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { listOwnerProperties } from "@/lib/services/property.service";
import { PageHeader } from "@/components/account/page-header";
import { OwnerListingActions } from "@/components/property/owner-listing-actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PROPERTY_STATUS_LABELS,
  RENT_PERIOD_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@/lib/constants";
import { cn, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My listings" };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Live" },
  { value: "PENDING_REVIEW", label: "In review" },
  { value: "DRAFT", label: "Drafts" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RENTED_OUT", label: "Rented out" },
] as const;

const STATUS_VARIANT: Record<string, "verified" | "pending" | "rejected" | "neutral"> = {
  ACTIVE: "verified",
  PENDING_REVIEW: "pending",
  REJECTED: "rejected",
  SUSPENDED: "rejected",
  DRAFT: "neutral",
  RENTED_OUT: "neutral",
};

export default async function LandlordPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRolePage(...PROVIDER_ROLES);
  const { status } = await searchParams;
  const activeTab = STATUS_TABS.some((t) => t.value === status) ? (status ?? "") : "";

  const properties = await listOwnerProperties(user.id, activeTab || undefined);

  return (
    <div>
      <PageHeader
        title="My listings"
        description="Nothing goes live without a human review. Drafts are visible only to you."
        actions={
          <Button asChild>
            <Link href="/dashboard/landlord/properties/new">
              <PlusCircle aria-hidden /> Add listing
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1.5" role="list" aria-label="Filter listings by status">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            role="listitem"
            href={tab.value ? `/dashboard/landlord/properties?status=${tab.value}` : "/dashboard/landlord/properties"}
            aria-current={activeTab === tab.value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {properties.some((p) => p.status === "SUSPENDED") && (
        <Alert variant="danger" className="mb-5">
          <AlertTitle>A listing was suspended</AlertTitle>
          <p className="text-sm">
            Suspended listings are hidden from search after a report or a failed check. The
            reason is shown below. You can appeal from the verification page.
          </p>
        </Alert>
      )}

      {properties.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-9 w-9" aria-hidden />}
          title={activeTab ? `No ${activeTab.replace("_", " ").toLowerCase()} listings` : "No listings yet"}
          description="Add a property to start receiving inquiries from students."
          action={
            <Button asChild>
              <Link href="/dashboard/landlord/properties/new">Add listing</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {properties.map((property) => {
            const cover = property.images[0];
            const rejection = property.verifications[0]?.rejectionReason;
            return (
              <li
                key={property.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-32">
                    {cover ? (
                      <Image
                        src={cover.thumbUrl ?? cover.url}
                        alt={cover.alt ?? property.title}
                        fill
                        sizes="128px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-slate-400">
                        No photo
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900">{property.title}</h2>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <Badge variant={STATUS_VARIANT[property.status] ?? "neutral"}>
                          {PROPERTY_STATUS_LABELS[property.status as keyof typeof PROPERTY_STATUS_LABELS] ?? property.status}
                        </Badge>
                        {property.verificationStatus === "VERIFIED" ? (
                          <Badge variant="verified">
                            <ShieldCheck className="h-3 w-3" aria-hidden /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            {VERIFICATION_STATUS_LABELS[property.verificationStatus as keyof typeof VERIFICATION_STATUS_LABELS] ?? property.verificationStatus}
                          </Badge>
                        )}
                        {property.isFeatured && <Badge variant="accent">Featured</Badge>}
                      </div>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {property.areaName}, {property.city}
                      {property.university ? ` · ${property.university.shortName}` : ""}
                      {property.campus ? ` (${property.campus.name})` : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatNaira(property.rentAmount)}
                      <span className="font-normal text-slate-500">
                        {" "}
                        per {RENT_PERIOD_LABELS[property.rentPeriod as keyof typeof RENT_PERIOD_LABELS] ?? property.rentPeriod}
                      </span>
                    </p>

                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <div className="flex gap-1">
                        <dt>Views</dt>
                        <dd className="font-medium text-slate-700">{property.viewCount}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt>Saved</dt>
                        <dd className="font-medium text-slate-700">{property.favoriteCount}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt>Inquiries</dt>
                        <dd className="font-medium text-slate-700">{property.inquiryCount}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt>Rating</dt>
                        <dd className="font-medium text-slate-700">
                          {property.reviewCount > 0
                            ? `${Number(property.avgRating).toFixed(1)} (${property.reviewCount})`
                            : "No reviews yet"}
                        </dd>
                      </div>
                    </dl>

                    {rejection && (
                      <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
                        <span className="font-semibold">Why: </span>
                        {rejection}
                      </p>
                    )}
                    {property.status === "PENDING_REVIEW" && (
                      <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                        In the review queue. We check that the photos match the description and
                        that every charge is disclosed. You will get a notification either way.
                      </p>
                    )}

                    <div className="mt-3">
                      <OwnerListingActions
                        propertyId={property.id}
                        slug={property.slug}
                        status={property.status}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
