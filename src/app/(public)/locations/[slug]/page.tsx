import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, GraduationCap, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { searchProperties } from "@/lib/services/search.service";
import { propertySearchSchema } from "@/lib/validation/property";
import { PropertyCard } from "@/components/property/property-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SITE_NAME, VERIFICATION_EXPLAINER } from "@/lib/constants";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const university = await prisma.university.findUnique({
    where: { slug },
    select: { name: true, shortName: true, city: true, state: true },
  });
  if (!university) return { title: `Area not found · ${SITE_NAME}`, robots: { index: false } };
  return {
    title: `Student housing near ${university.name} · ${SITE_NAME}`,
    description: `Compare student accommodation near ${university.name} (${university.shortName}) in ${university.city}, ${university.state} — rents, reviews from students who stayed there, and verified listings.`,
    alternates: { canonical: `/locations/${slug}` },
  };
}

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;

  const university = await prisma.university.findUnique({
    where: { slug },
    include: {
      campuses: { orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, city: true } },
    },
  });
  if (!university) notFound();

  const activeWhere = { status: "ACTIVE" as const, deletedAt: null, universityId: university.id };

  const [aggregate, verifiedCount, reviewCount, roommateCount, areaCounts, campusesWithListings, search] =
    await Promise.all([
      prisma.property.aggregate({ where: activeWhere, _count: { _all: true }, _avg: { rentAmount: true } }),
      prisma.property.count({ where: { ...activeWhere, verificationStatus: "VERIFIED" } }),
      prisma.review.count({ where: { status: "PUBLISHED", property: activeWhere } }),
      prisma.roommateProfile.count({ where: { status: "ACTIVE", universityId: university.id } }),
      prisma.property.groupBy({
        by: ["neighborhoodId"],
        where: { ...activeWhere, neighborhoodId: { not: null } },
        _count: { _all: true },
      }),
      prisma.property.groupBy({
        by: ["campusId"],
        where: { ...activeWhere, campusId: { not: null } },
        _count: { _all: true },
      }),
      searchProperties(
        propertySearchSchema.parse({ universityId: university.id, sort: "most_reviewed", pageSize: 6 }),
      ),
    ]);

  const areas = await prisma.neighborhood.findMany({
    where: { id: { in: areaCounts.map((row) => row.neighborhoodId ?? "") } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, city: true },
  });
  const areaCountFor = (id: string) =>
    areaCounts.find((row) => row.neighborhoodId === id)?._count._all ?? 0;
  const campusCountFor = (id: string) =>
    campusesWithListings.find((row) => row.campusId === id)?._count._all ?? 0;

  const total = aggregate._count._all;
  const averageRent = aggregate._avg.rentAmount ? Number(aggregate._avg.rentAmount) : null;

  const stats = [
    { icon: Building2, label: "Live listings", value: String(total) },
    { icon: ShieldCheck, label: "Verified", value: String(verifiedCount), title: VERIFICATION_EXPLAINER },
    { icon: Star, label: "Published reviews", value: String(reviewCount) },
    { icon: Users, label: "Roommates looking", value: String(roommateCount) },
  ];

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span aria-hidden> / </span>
        <span className="text-slate-700">{university.shortName}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <GraduationCap className="h-5 w-5 text-brand-700" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Student housing near {university.name}
          </h1>
          {university.isDemoData && (
            <Badge variant="neutral" title="This institution was created by the demo seeder, not from a live data source.">
              Demo data
            </Badge>
          )}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
          <MapPin className="h-4 w-4" aria-hidden />
          {university.city}, {university.state} · {university.country}
          {university.campuses.length > 0 && <> · {university.campuses.length} campus{university.campuses.length === 1 ? "" : "es"}</>}
        </p>
      </header>

      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4" title={stat.title}>
            <stat.icon className="h-4 w-4 text-slate-400" aria-hidden />
            <dd className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{stat.value}</dd>
            <dt className="text-xs text-slate-500">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {total === 0 ? (
        <EmptyState
          icon={<Building2 className="h-9 w-9" aria-hidden />}
          title={`No live listings near ${university.shortName} yet`}
          description="Nobody has published an approved listing for this institution yet. We will not pad this page with homes from another city — check back, or tell a landlord you know about StudentNest."
          action={
            <Button asChild>
              <Link href="/properties">Browse all listings</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Typical asking rent</CardTitle>
                <CardDescription>
                  Average of all {total} live listing{total === 1 ? "" : "s"} attached to this
                  institution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-slate-900">
                  {averageRent === null ? "—" : formatNaira(averageRent)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  This is an average of asking prices across room types and rental periods, not a
                  quote. Always confirm the total cost — rent, deposit, agency fee and any service
                  charge — before paying.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campuses & areas</CardTitle>
                <CardDescription>Narrow the search to where you actually attend.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {university.campuses.map((campus) => (
                    <Link
                      key={campus.id}
                      href={`/properties?universityId=${university.id}&campusId=${campus.id}`}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 transition-colors hover:border-brand-500 hover:text-brand-700"
                    >
                      {campus.name}
                      <span className="ml-1.5 text-xs text-slate-400">
                        {campusCountFor(campus.id)} listing{campusCountFor(campus.id) === 1 ? "" : "s"}
                      </span>
                    </Link>
                  ))}
                </div>

                {areas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {areas.map((area) => (
                      <Link
                        key={area.id}
                        href={`/properties?neighborhood=${encodeURIComponent(area.slug)}`}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 transition-colors hover:border-brand-500 hover:text-brand-700"
                      >
                        {area.name}
                        <span className="ml-1.5 text-xs text-slate-400">
                          {areaCountFor(area.id)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No listings for this institution have been tagged with a specific area yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Most reviewed listings</h2>
              <p className="text-sm text-slate-600">
                Ordered by how many students have actually reviewed them — not by who paid for
                placement.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/properties?universityId=${university.id}`}>
                See all {total} listing{total === 1 ? "" : "s"}
              </Link>
            </Button>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {search.items.map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} />
              </li>
            ))}
          </ul>

          <Alert variant="info" className="mt-6">
            <p className="text-sm">
              {VERIFICATION_EXPLAINER} {reviewCount} published review
              {reviewCount === 1 ? "" : "s"} from students who stayed in these properties are
              visible on each listing.
            </p>
          </Alert>
        </>
      )}

      {roommateCount > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Looking for someone to share with?</CardTitle>
            <CardDescription>
              {roommateCount} student{roommateCount === 1 ? "" : "s"} at {university.shortName}{" "}
              {roommateCount === 1 ? "has" : "have"} an active roommate profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/roommates?university=${university.id}`}>Browse roommate profiles</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
