import type { Metadata } from "next";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { dailyRegistrations } from "@/lib/services/admin.service";
import { PageHeader } from "@/components/account/page-header";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/account/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { REPORT_REASON_LABELS, REVIEW_STATUS_LABELS } from "@/lib/constants";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · Analytics", robots: { index: false } };

const DAYS = 30;

/** Saved-search filters are the only demand signal we store — summarise them honestly. */
function summarizeSavedSearches(rows: { query: unknown }[]) {
  const cities = new Map<string, number>();
  const universities = new Map<string, number>();
  const budgets: { label: string; count: number }[] = [];
  const buckets = [
    { label: "Under ₦100k", max: 100_000 },
    { label: "₦100k – ₦250k", max: 250_000 },
    { label: "₦250k – ₦500k", max: 500_000 },
    { label: "Over ₦500k", max: Number.POSITIVE_INFINITY },
  ];
  for (const bucket of buckets) budgets.push({ label: bucket.label, count: 0 });

  for (const row of rows) {
    const query = (row.query && typeof row.query === "object" ? row.query : {}) as Record<string, unknown>;
    const city = typeof query.city === "string" ? query.city.trim() : "";
    if (city) cities.set(city, (cities.get(city) ?? 0) + 1);
    const university = typeof query.university === "string" ? query.university.trim().toUpperCase() : "";
    if (university) universities.set(university, (universities.get(university) ?? 0) + 1);

    const maxRent = Number(query.maxRent);
    if (Number.isFinite(maxRent) && maxRent > 0) {
      const index = buckets.findIndex((b) => maxRent <= b.max);
      if (index >= 0) budgets[index].count += 1;
    }
  }

  const top = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return { cities: top(cities), universities: top(universities), budgets: budgets.filter((b) => b.count > 0) };
}

function dailyCounts(dates: Date[], days: number) {
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    byDay.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
  }
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count }));
}

function BarChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div
      className="flex h-32 items-end gap-[2px]"
      role="img"
      aria-label={`${label}: peak ${max} in a single day over the last ${data.length} days`}
    >
      {data.map((point) => (
        <div key={point.date} className="group relative flex-1">
          <div
            className="w-full rounded-t bg-brand-500 transition-colors group-hover:bg-brand-700"
            style={{ height: `${Math.max(point.count === 0 ? 2 : 8, (point.count / max) * 100)}%` }}
          />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] text-white group-hover:block">
            {point.date.slice(5)}: {point.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function RankedList({
  entries,
  formatValue,
  empty,
}: {
  entries: { label: string; value: number; hint?: string }[];
  formatValue?: (value: number) => string;
  empty: string;
}) {
  if (entries.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(1, ...entries.map((e) => e.value));
  return (
    <ul className="space-y-2.5">
      {entries.map((entry) => (
        <li key={entry.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-800">{entry.label}</span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {formatValue ? formatValue(entry.value) : entry.value}
              {entry.hint && <span className="ml-1 text-xs text-slate-400">{entry.hint}</span>}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-slate-700"
              style={{ width: `${(entry.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminAnalyticsPage() {
  await requireRolePage("ADMIN");
  const since = new Date(Date.now() - DAYS * 86_400_000);

  const [
    registrations,
    propertyRows,
    inquiryRows,
    reviewRows,
    messageRows,
    savedSearches,
    listingsByCity,
    listingsByType,
    verifiedCounts,
    reviewStatusRows,
    reportsByReason,
    openReportCount,
    oldestPendingVerification,
    payments,
  ] = await Promise.all([
    dailyRegistrations(DAYS),
    prisma.property.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.inquiry.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.review.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.message.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.savedSearch.findMany({ select: { query: true } }),
    prisma.property.groupBy({
      by: ["city"],
      where: { status: "ACTIVE", deletedAt: null },
      _count: { _all: true },
      _avg: { rentAmount: true },
    }),
    prisma.property.groupBy({
      by: ["propertyType"],
      where: { status: "ACTIVE", deletedAt: null },
      _count: { _all: true },
    }),
    prisma.property.groupBy({
      by: ["verificationStatus"],
      where: { status: "ACTIVE", deletedAt: null },
      _count: { _all: true },
    }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.report.groupBy({ by: ["reason"], _count: { _all: true } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.verificationRequest.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountKobo: true } }),
  ]);

  const demand = summarizeSavedSearches(savedSearches);

  const cityEntries = listingsByCity
    .map((row) => ({
      label: row.city,
      value: row._count._all,
      hint: row._avg.rentAmount ? `avg ${formatNaira(Number(row._avg.rentAmount))}` : undefined,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const typeEntries = listingsByType
    .map((row) => ({ label: row.propertyType.replace(/_/g, " "), value: row._count._all }))
    .sort((a, b) => b.value - a.value);

  const verified = Object.fromEntries(verifiedCounts.map((r) => [r.verificationStatus, r._count._all]));
  const totalLive = verifiedCounts.reduce((sum, r) => sum + r._count._all, 0);
  const verifiedShare = totalLive === 0 ? 0 : Math.round(((verified.VERIFIED ?? 0) / totalLive) * 100);

  const reportEntries = reportsByReason
    .map((row) => ({
      label: REPORT_REASON_LABELS[row.reason as keyof typeof REPORT_REASON_LABELS] ?? row.reason,
      value: row._count._all,
    }))
    .sort((a, b) => b.value - a.value);

  const successfulPayments = payments.filter((p) => p.status === "SUCCESS");
  const revenueKobo = successfulPayments.reduce((sum, p) => sum + (p._sum.amountKobo ?? 0), 0);
  const pendingVerificationDays = oldestPendingVerification
    ? Math.max(0, Math.floor((Date.now() - oldestPendingVerification.createdAt.getTime()) / 86_400_000))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Last ${DAYS} days. Every figure below is computed from real rows in this database — nothing is estimated or back-filled.`}
      />

      {pendingVerificationDays >= 3 && (
        <Alert variant="warning">
          <AlertTitle>Verification backlog</AlertTitle>
          The oldest pending identity or ownership check has been waiting {pendingVerificationDays}{" "}
          day{pendingVerificationDays === 1 ? "" : "s"}. Landlords cannot earn a verified badge until
          you decide —{" "}
          <Link href="/admin/verifications?status=PENDING" className="font-medium underline">
            open the queue
          </Link>
          .
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`New signups (${DAYS}d)`} value={registrations.reduce((s, d) => s + d.count, 0)} tone="positive" />
        <StatCard label={`New listings (${DAYS}d)`} value={propertyRows.length} />
        <StatCard label={`Inquiries (${DAYS}d)`} value={inquiryRows.length} tone="positive" />
        <StatCard label={`Reviews (${DAYS}d)`} value={reviewRows.length} />
        <StatCard label={`Messages (${DAYS}d)`} value={messageRows.length} />
        <StatCard
          label="Live verified share"
          value={`${verifiedShare}%`}
          hint={`${verified.VERIFIED ?? 0} of ${totalLive} live listings`}
          tone={verifiedShare >= 40 ? "positive" : "warning"}
        />
        <StatCard
          label="Open reports"
          value={openReportCount}
          href="/admin/reports?status=OPEN"
          tone={openReportCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Paid by landlords"
          value={formatNaira(revenueKobo / 100)}
          hint={`${successfulPayments.length} successful charge${successfulPayments.length === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registrations</CardTitle>
            <CardDescription>New accounts per day, last {DAYS} days.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={registrations} label="New registrations" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supply</CardTitle>
            <CardDescription>New listings created per day, last {DAYS} days.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={dailyCounts(propertyRows.map((p) => p.createdAt), DAYS)} label="New listings" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student demand</CardTitle>
            <CardDescription>
              Inquiries sent per day, last {DAYS} days. This is the clearest signal that a listing
              actually reached someone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={dailyCounts(inquiryRows.map((i) => i.createdAt), DAYS)} label="Inquiries" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review activity</CardTitle>
            <CardDescription>Reviews written per day, last {DAYS} days.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={dailyCounts(reviewRows.map((r) => r.createdAt), DAYS)} label="Reviews" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What students are saving</CardTitle>
            <CardDescription>
              Built from {savedSearches.length} saved search{savedSearches.length === 1 ? "" : "es"}.
              We do not log ad-hoc searches, so this understates total demand — it only shows what
              people cared enough to keep.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Budget ceilings
              </p>
              <RankedList
                entries={demand.budgets.map((b) => ({ label: b.label, value: b.count }))}
                empty="No saved search sets a maximum rent."
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cities
              </p>
              <RankedList entries={demand.cities.map(([label, value]) => ({ label, value }))} empty="No saved search filters by city." />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Institutions
              </p>
              <RankedList
                entries={demand.universities.map(([label, value]) => ({ label, value }))}
                empty="No saved search filters by university."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where the supply is</CardTitle>
            <CardDescription>
              Live listings by city with the average asking rent. Compare against saved budgets to
              spot cities where demand outstrips affordable supply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <RankedList entries={cityEntries} empty="No live listings yet." />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                By property type
              </p>
              <RankedList entries={typeEntries} empty="No live listings yet." />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trust health</CardTitle>
            <CardDescription>
              Review moderation state and the verification coverage of live listings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {reviewStatusRows.length === 0 && <li className="text-sm text-slate-500">No reviews yet.</li>}
              {reviewStatusRows
                .slice()
                .sort((a, b) => b._count._all - a._count._all)
                .map((row) => (
                  <li key={row.status} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">
                      {REVIEW_STATUS_LABELS[row.status as keyof typeof REVIEW_STATUS_LABELS] ?? row.status}
                    </span>
                    <Badge variant={row.status === "PUBLISHED" ? "verified" : row.status === "REJECTED" ? "rejected" : "pending"}>
                      {row._count._all}
                    </Badge>
                  </li>
                ))}
            </ul>
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reports by reason
              </p>
              <RankedList entries={reportEntries} empty="No reports have been filed." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>
              Optional landlord services only. Searching, viewing and reviewing are never paid
              features, so this figure can be zero on a healthy platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                title="No payments yet"
                description="Charges appear here once a landlord buys a featured placement or a verification service."
              />
            ) : (
              <ul className="space-y-2">
                {payments.map((row) => (
                  <li key={row.status} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">{row.status.replace(/_/g, " ")}</span>
                    <span className="tabular-nums text-slate-600">
                      {row._count._all} · {formatNaira((row._sum.amountKobo ?? 0) / 100)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
