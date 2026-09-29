import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  FileText,
  Heart,
  MessageSquare,
  Search,
  Star,
  Users,
} from "lucide-react";
import { requireUserPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { listFavoriteProperties } from "@/lib/services/property.service";
import { unreadMessageCount } from "@/lib/services/messaging.service";
import { unreadNotificationCount } from "@/lib/services/notification.service";
import { PageHeader } from "@/components/account/page-header";
import { StatCard } from "@/components/account/stat-card";
import { PropertyCard } from "@/components/property/property-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { INQUIRY_STATUS_LABELS } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentDashboardPage() {
  const user = await requireUserPage("/dashboard/student");

  const [
    favoriteCount,
    savedSearchCount,
    inquiryTotal,
    inquiryAwaiting,
    reviewRows,
    unreadNotifications,
    unreadMessages,
    roommateProfile,
    recentFavorites,
    recentInquiries,
  ] = await Promise.all([
    prisma.favoriteProperty.count({ where: { userId: user.id, property: { deletedAt: null } } }),
    prisma.savedSearch.count({ where: { userId: user.id } }),
    prisma.inquiry.count({ where: { studentId: user.id } }),
    prisma.inquiry.count({ where: { studentId: user.id, status: "NEW" } }),
    prisma.review.groupBy({
      by: ["status"],
      where: { authorId: user.id, deletedAt: null },
      _count: { _all: true },
    }),
    unreadNotificationCount(user.id),
    unreadMessageCount(user.id),
    prisma.roommateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    }),
    listFavoriteProperties(user.id).then((rows) => rows.slice(0, 3)),
    prisma.inquiry.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        ownerResponse: true,
        respondedAt: true,
        property: { select: { slug: true, title: true } },
      },
    }),
  ]);

  const reviewCount = reviewRows.reduce((sum, row) => sum + row._count._all, 0);
  const publishedReviews = reviewRows.find((r) => r.status === "PUBLISHED")?._count._all ?? 0;
  const pendingReviews =
    reviewRows
      .filter((r) => r.status === "UNDER_REVIEW" || r.status === "DISPUTED")
      .reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Your saved listings, inquiries, reviews and roommate profile in one place."
        actions={
          <Button asChild>
            <Link href="/properties">
              <Search aria-hidden /> Search housing
            </Link>
          </Button>
        }
      />

      {!roommateProfile && (
        <Card className="mb-5 border-brand-200 bg-brand-50/60">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-slate-900">Looking for a roommate?</p>
                <p className="text-sm text-slate-600">
                  Create a roommate profile to see transparent compatibility scores with other
                  students. Your profile controls what is shared.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/student/roommate">Create profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Saved properties"
          value={favoriteCount}
          hint={savedSearchCount > 0 ? `${savedSearchCount} saved search${savedSearchCount === 1 ? "" : "es"}` : undefined}
          href="/dashboard/student/saved"
          icon={Heart}
        />
        <StatCard
          label="Inquiries sent"
          value={inquiryTotal}
          hint={inquiryAwaiting > 0 ? `${inquiryAwaiting} awaiting a reply` : "All answered or closed"}
          href="/dashboard/student/inquiries"
          icon={FileText}
          tone={inquiryAwaiting > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Reviews written"
          value={reviewCount}
          hint={
            pendingReviews > 0
              ? `${pendingReviews} still in moderation`
              : `${publishedReviews} published`
          }
          href="/dashboard/student/reviews"
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
          label="Unread notifications"
          value={unreadNotifications}
          href="/notifications"
          icon={Bell}
          tone={unreadNotifications > 0 ? "positive" : "default"}
        />
        <StatCard
          label="Roommate profile"
          value={roommateProfile ? "Active" : "Not set up"}
          hint={
            roommateProfile?.status === "PAUSED"
              ? "Paused — hidden from other students"
              : roommateProfile
                ? "Visible to other students"
                : "Create one to get matched"
          }
          href="/dashboard/student/roommate"
          icon={Users}
          tone={roommateProfile ? "positive" : "warning"}
        />
      </div>

      <section className="mt-8" aria-labelledby="recent-inquiries">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-inquiries" className="text-base font-semibold text-slate-900">
            Recent inquiries
          </h2>
          <Link
            href="/dashboard/student/inquiries"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {recentInquiries.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-9 w-9" aria-hidden />}
            title="No inquiries yet"
            description="Ask a landlord or caretaker about availability, total cost or a viewing from any listing page. Contact stays inside StudentNest — you never have to share your phone number."
            action={
              <Button asChild variant="outline">
                <Link href="/properties">Browse listings</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {recentInquiries.map((inquiry) => (
              <li key={inquiry.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/properties/${inquiry.property.slug}`}
                      className="text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                    >
                      {inquiry.property.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Sent {timeAgo(inquiry.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      inquiry.status === "NEW"
                        ? "pending"
                        : inquiry.status === "CLOSED"
                          ? "neutral"
                          : "verified"
                    }
                  >
                    {INQUIRY_STATUS_LABELS[inquiry.status]}
                  </Badge>
                </div>
                {inquiry.ownerResponse && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-semibold">Reply: </span>
                    {inquiry.ownerResponse}
                    {inquiry.respondedAt && (
                      <span className="mt-1 block text-xs text-slate-400">
                        {formatDate(inquiry.respondedAt)}
                      </span>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="recent-saved">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-saved" className="text-base font-semibold text-slate-900">
            Recently saved
          </h2>
          <Link
            href="/dashboard/student/saved"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {recentFavorites.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-9 w-9" aria-hidden />}
            title="Nothing saved yet"
            description="Tap the heart on any listing to keep it here. We will tell you if the rent changes."
            action={
              <Button asChild variant="outline">
                <Link href="/properties">Find housing</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recentFavorites.map((row) => (
              <div key={row.favoriteId}>
                {row.priceChanged && (
                  <p className="mb-1 text-xs font-semibold text-amber-700">
                    Rent changed since you saved this
                  </p>
                )}
                <PropertyCard property={row.property} isFavorited />
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-slate-400">
        A review marked &ldquo;under review&rdquo; is being checked by our moderation team — it is
        not published yet, and it has not been removed.
      </p>
    </div>
  );
}
