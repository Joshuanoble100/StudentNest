import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  FileText,
  Heart,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ownerListingSummary } from "@/lib/services/property.service";
import { unreadMessageCount } from "@/lib/services/messaging.service";
import { unreadNotificationCount } from "@/lib/services/notification.service";
import { isUserVerified } from "@/lib/services/verification.service";
import { PageHeader } from "@/components/account/page-header";
import { StatCard } from "@/components/account/stat-card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { INQUIRY_STATUS_LABELS, PROPERTY_STATUS_LABELS } from "@/lib/constants";
import { formatNaira, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Landlord dashboard" };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

export default async function LandlordDashboardPage() {
  const user = await requireRolePage(...PROVIDER_ROLES);

  const [summary, totals, newInquiries, unreadMessages, unreadNotifications, verified, recentListings, reviewStats] =
    await Promise.all([
      ownerListingSummary(user.id),
      prisma.property.aggregate({
        where: { ownerId: user.id, deletedAt: null },
        _sum: { viewCount: true, favoriteCount: true, inquiryCount: true },
      }),
      prisma.inquiry.count({ where: { ownerId: user.id, status: "NEW" } }),
      unreadMessageCount(user.id),
      unreadNotificationCount(user.id),
      isUserVerified(user.id),
      prisma.property.findMany({
        where: { ownerId: user.id, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          verificationStatus: true,
          rentAmount: true,
          rentPeriod: true,
          areaName: true,
          viewCount: true,
          inquiryCount: true,
          updatedAt: true,
          verifications: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true, rejectionReason: true },
          },
        },
      }),
      prisma.review.groupBy({
        by: ["status"],
        where: { property: { ownerId: user.id }, deletedAt: null },
        _count: { _all: true },
        _avg: { overallRating: true },
      }),
    ]);

  const countFor = (status: string) => summary.find((row) => row.status === status)?.count ?? 0;
  const liveCount = countFor("ACTIVE");
  const pendingCount = countFor("PENDING_REVIEW");
  const rejectedCount = countFor("REJECTED") + countFor("SUSPENDED");
  const publishedReviews = reviewStats.find((r) => r.status === "PUBLISHED");

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Your listings, student inquiries and review activity."
        actions={
          <Button asChild>
            <Link href="/dashboard/landlord/properties/new">
              <PlusCircle aria-hidden /> Add a listing
            </Link>
          </Button>
        }
      />

      {!verified && user.role !== "ADMIN" && (
        <Alert variant="warning" className="mb-5">
          <AlertTitle>You are not identity-verified yet</AlertTitle>
          <p className="text-sm">
            You can still list properties, but students see an “unverified” label next to your
            name and verified listings are ranked higher in trust signals. Verification is free
            and your documents stay private — only our moderation team can see them.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/dashboard/verification">
              <ShieldCheck aria-hidden /> Start verification
            </Link>
          </Button>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Live listings"
          value={liveCount}
          hint={pendingCount > 0 ? `${pendingCount} awaiting review` : undefined}
          href="/dashboard/landlord/properties"
          icon={FileText}
          tone={liveCount > 0 ? "positive" : "warning"}
        />
        <StatCard
          label="New inquiries"
          value={newInquiries}
          hint={newInquiries > 0 ? "Students are waiting for a reply" : "All answered"}
          href="/dashboard/landlord/inquiries"
          icon={MessageSquare}
          tone={newInquiries > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total views"
          value={totals._sum.viewCount ?? 0}
          hint={`${totals._sum.favoriteCount ?? 0} saved by students`}
          icon={Eye}
        />
        <StatCard
          label="Reviews received"
          value={publishedReviews?._count._all ?? 0}
          hint={
            publishedReviews?._avg.overallRating
              ? `Average ${Number(publishedReviews._avg.overallRating).toFixed(1)} / 5`
              : "No published reviews yet"
          }
          href="/dashboard/landlord/reviews"
          icon={Star}
        />
        <StatCard
          label="Unread messages"
          value={unreadMessages}
          href="/messages"
          icon={MessageSquare}
          tone={unreadMessages > 0 ? "positive" : "default"}
        />
        <StatCard
          label="Notifications"
          value={unreadNotifications}
          href="/notifications"
          icon={Heart}
        />
      </div>

      {rejectedCount > 0 && (
        <Alert variant="danger" className="mt-5">
          <AlertTitle>
            {rejectedCount} listing{rejectedCount === 1 ? "" : "s"} rejected or suspended
          </AlertTitle>
          <p className="text-sm">
            The reason is shown next to each listing. Fix the problem and resubmit — we do not
            delete your listing or your reviews over a rejection.
          </p>
        </Alert>
      )}

      <section className="mt-8" aria-labelledby="recent-listings">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-listings" className="text-base font-semibold text-slate-900">
            Recently updated listings
          </h2>
          <Link
            href="/dashboard/landlord/properties"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Manage all
          </Link>
        </div>

        {recentListings.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-9 w-9" aria-hidden />}
            title="No listings yet"
            description="Add your first property. Every listing is reviewed by our team before it appears in student search."
            action={
              <Button asChild>
                <Link href="/dashboard/landlord/properties/new">Add a listing</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {recentListings.map((listing) => (
                  <li key={listing.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/landlord/properties/${listing.id}/edit`}
                        className="text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {listing.areaName} · {formatNaira(listing.rentAmount)} per{" "}
                        {listing.rentPeriod.replace("PER_", "").toLowerCase()} ·{" "}
                        {listing.viewCount} views · {listing.inquiryCount} inquiries · updated{" "}
                        {timeAgo(listing.updatedAt)}
                      </p>
                      {listing.verifications[0]?.rejectionReason && (
                        <p className="mt-1 text-xs text-red-700">
                          Reason: {listing.verifications[0].rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge variant={listing.status === "ACTIVE" ? "verified" : listing.status === "PENDING_REVIEW" ? "pending" : listing.status === "REJECTED" || listing.status === "SUSPENDED" ? "rejected" : "neutral"}>
                        {PROPERTY_STATUS_LABELS[listing.status as keyof typeof PROPERTY_STATUS_LABELS] ?? listing.status}
                      </Badge>
                      {listing.verificationStatus === "VERIFIED" && (
                        <Badge variant="verified">
                          <ShieldCheck className="h-3 w-3" aria-hidden /> Verified
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="mt-8" aria-labelledby="inquiry-queue">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="inquiry-queue" className="text-base font-semibold text-slate-900">
            Awaiting your reply
          </h2>
          <Link
            href="/dashboard/landlord/inquiries"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <AwaitingReplies ownerId={user.id} />
      </section>

      <p className="mt-8 text-xs text-slate-400">
        {INQUIRY_STATUS_LABELS.NEW}: the student has asked and you have not replied yet.
        Response rate is shown publicly on your listings, so reply even when the answer is no.
      </p>
    </div>
  );
}

async function AwaitingReplies({ ownerId }: { ownerId: string }) {
  const inquiries = await prisma.inquiry.findMany({
    where: { ownerId, status: "NEW" },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: {
      id: true,
      message: true,
      createdAt: true,
      student: { select: { name: true } },
      property: { select: { title: true, slug: true } },
    },
  });

  if (inquiries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-600">Nothing waiting</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id} className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {inquiry.student.name} asked about{" "}
              <Link
                href={`/properties/${inquiry.property.slug}`}
                className="text-brand-700 hover:underline"
              >
                {inquiry.property.title}
              </Link>
            </p>
            <span className="text-xs text-slate-500">{timeAgo(inquiry.createdAt)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{inquiry.message}</p>
        </li>
      ))}
    </ul>
  );
}
