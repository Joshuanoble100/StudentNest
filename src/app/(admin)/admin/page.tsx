import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Flag,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { dailyRegistrations, getDashboardStats } from "@/lib/services/admin.service";
import { PageHeader } from "@/components/account/page-header";
import { StatCard } from "@/components/account/stat-card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin overview", robots: { index: false } };

export default async function AdminOverviewPage() {
  await requireRolePage("ADMIN");

  const [stats, registrations, queue, recentAudit] = await Promise.all([
    getDashboardStats(),
    dailyRegistrations(14),
    prisma.$transaction([
      prisma.property.findMany({
        where: { status: "PENDING_REVIEW", deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: { id: true, title: true, areaName: true, createdAt: true, owner: { select: { name: true } } },
      }),
      prisma.review.findMany({
        where: { status: { in: ["UNDER_REVIEW", "DISPUTED"] }, deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: {
          id: true,
          status: true,
          overallRating: true,
          createdAt: true,
          property: { select: { title: true, slug: true } },
        },
      }),
      prisma.verificationRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: { id: true, type: true, createdAt: true, user: { select: { name: true, email: true } } },
      }),
    ]),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  const [pendingProperties, flaggedReviews, pendingVerifications] = queue;
  const peak = Math.max(1, ...registrations.map((r) => r.count));
  const backlog = stats.pendingListings + stats.openReports + pendingVerifications.length;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Everything waiting on a human decision, oldest first."
      />

      {backlog > 0 && (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>{backlog} item{backlog === 1 ? "" : "s"} in the moderation backlog</AlertTitle>
          <p className="text-sm">
            {stats.pendingListings} listing{stats.pendingListings === 1 ? "" : "s"} awaiting review ·{" "}
            {stats.openReports} open report{stats.openReports === 1 ? "" : "s"} ·{" "}
            {pendingVerifications.length} verification request
            {pendingVerifications.length === 1 ? "" : "s"}. Students and landlords are waiting on
            these — a listing stuck in review is invisible to everyone.
          </p>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.totalUsers} hint={`${stats.students} students · ${stats.landlords + stats.agents} providers`} href="/admin/users" icon={Users} />
        <StatCard label="Live listings" value={stats.activeListings} hint={`${stats.pendingListings} pending review`} href="/admin/properties" icon={Building2} tone={stats.pendingListings > 0 ? "warning" : "positive"} />
        <StatCard label="Verified properties" value={stats.verifiedProperties} hint={`${stats.activeListings > 0 ? Math.round((stats.verifiedProperties / stats.activeListings) * 100) : 0}% of live listings`} icon={ShieldCheck} />
        <StatCard label="Open reports" value={stats.openReports} hint={`${stats.reportedProperties} against listings · ${stats.reportedReviews} against reviews`} href="/admin/reports" icon={Flag} tone={stats.openReports > 0 ? "warning" : "default"} />
        <StatCard label="Reviews" value={stats.totalReviews} hint={`${stats.publishedReviews} published`} href="/admin/reviews" icon={Star} />
        <StatCard label="Messages sent" value={stats.totalMessages} icon={MessageSquare} />
        <StatCard label="New users (24h)" value={stats.newUsers24h} hint={`${stats.newUsers30d} in the last 30 days`} />
        <StatCard label="Inquiries (24h)" value={stats.newInquiries24h} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Listings awaiting review</CardTitle>
            <CardDescription>Oldest first. Nothing goes live automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingProperties.length === 0 ? (
              <p className="text-sm text-slate-500">Queue is empty.</p>
            ) : (
              <ul className="space-y-2">
                {pendingProperties.map((property) => (
                  <li key={property.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0">
                      <Link href={`/admin/properties?id=${property.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {property.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {property.areaName} · {property.owner.name} · waiting {timeAgo(property.createdAt)}
                      </p>
                    </div>
                    <Badge variant="pending">Pending</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reviews needing a decision</CardTitle>
            <CardDescription>
              Under review or disputed. Both stay visible to moderators only until decided.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flaggedReviews.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing flagged.</p>
            ) : (
              <ul className="space-y-2">
                {flaggedReviews.map((review) => (
                  <li key={review.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0">
                      <Link href={`/admin/reviews?id=${review.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {review.property.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {review.overallRating}/5 · waiting {timeAgo(review.createdAt)}
                      </p>
                    </div>
                    <Badge variant={review.status === "DISPUTED" ? "rejected" : "pending"}>
                      {review.status === "DISPUTED" ? "Disputed" : "Under review"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Registrations, last 14 days</CardTitle>
            <CardDescription>New accounts per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-1" role="img" aria-label={`Registrations over the last 14 days. Peak ${peak} in a single day.`}>
              {registrations.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-brand-600"
                    style={{ height: `${Math.max(2, (day.count / peak) * 100)}%` }}
                    title={`${day.date}: ${day.count}`}
                  />
                  <span className="text-[9px] text-slate-400">{day.date.slice(8)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent audit entries</CardTitle>
            <CardDescription>
              Every moderation decision is recorded here with the actor and their reason.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-slate-500">No entries yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0">
                    <span className="min-w-0">
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">{entry.action}</code>{" "}
                      <span className="text-slate-500">{entry.actor?.email ?? "system"}</span>
                    </span>
                    <span className="shrink-0 text-slate-400">{timeAgo(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/audit-logs" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
              View full audit log
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
