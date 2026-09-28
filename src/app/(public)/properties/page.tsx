import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchX, Home as HomeIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { propertySearchSchema } from "@/lib/validation/property";
import { searchProperties, searchPropertiesForMap } from "@/lib/services/search.service";
import { interactiveMapConfig } from "@/lib/services/maps.service";
import { PropertyCard } from "@/components/property/property-card";
import { FilterPanel } from "@/components/search/filter-panel";
import { ResultsToolbar, type ViewMode } from "@/components/search/results-toolbar";
import { MapResults, type MapListingPoint } from "@/components/search/map-results";
import { Pagination } from "@/components/search/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_NAME } from "@/lib/constants";

type RawParams = Record<string, string | string[] | undefined>;

function normalize(raw: RawParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = Array.isArray(value) ? value[value.length - 1] : value;
  }
  return out;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<Metadata> {
  const raw = normalize(await searchParams);
  const parsed = propertySearchSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : null;

  const parts: string[] = [];
  if (filters?.q) parts.push(`"${filters.q}"`);
  if (filters?.propertyType) parts.push(filters.propertyType.replaceAll("_", " ").toLowerCase());
  if (filters?.university) parts.push(filters.university);
  if (filters?.city) parts.push(filters.city);
  if (filters?.maxRent) parts.push(`under ₦${Number(filters.maxRent).toLocaleString("en-NG")}`);

  const title = parts.length > 0 ? `Student housing: ${parts.join(", ")}` : "Browse student housing";

  return {
    title,
    description:
      "Search verified student accommodation in Nigeria. Filter by rent, property type, amenities, distance to campus and student reviews.",
    alternates: { canonical: "/properties" },
    openGraph: { title: `${title} | ${SITE_NAME}`, type: "website" },
  };
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const raw = normalize(await searchParams);
  const parsed = propertySearchSchema.safeParse(raw);
  const invalidFilters = !parsed.success;
  const input = parsed.success
    ? parsed.data
    : propertySearchSchema.parse({ page: 1, pageSize: 12, sort: "newest", amenities: undefined });

  const rawView = typeof raw.view === "string" ? raw.view : "grid";
  const view: ViewMode = rawView === "list" || rawView === "map" ? rawView : "grid";

  const [results, mapPoints, universities, cities, neighborhoods, user, campus] = await Promise.all([
    searchProperties(input),
    view === "map" ? searchPropertiesForMap(input) : Promise.resolve([]),
    prisma.university.findMany({
      select: { shortName: true, name: true },
      orderBy: { shortName: "asc" },
      take: 100,
    }),
    prisma.property.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
      take: 100,
    }),
    prisma.neighborhood.findMany({
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    getSessionUser(),
    input.campusId
      ? prisma.campus.findUnique({ where: { id: input.campusId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const favoriteIds = user
    ? new Set(
        (
          await prisma.favoriteProperty.findMany({
            where: { userId: user.id },
            select: { propertyId: true },
          })
        ).map((f) => f.propertyId),
      )
    : new Set<string>();

  const paramsKey = new URLSearchParams(
    Object.entries(raw).reduce<Record<string, string>>((acc, [k, v]) => {
      if (typeof v === "string") acc[k] = v;
      return acc;
    }, {}),
  ).toString();

  const mapConfig = interactiveMapConfig();
  const points: MapListingPoint[] = mapPoints.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    rentAmount: p.rentAmount,
    rentPeriod: p.rentPeriod,
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    locationApproximate: p.locationApproximate,
    verificationStatus: p.verificationStatus,
    image: p.images[0]?.thumbUrl ?? p.images[0]?.url ?? null,
  }));

  const hrefFor = (page: number) => {
    const params = new URLSearchParams(paramsKey);
    params.set("page", String(page));
    return `/properties?${params.toString()}`;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Student housing listings",
    numberOfItems: results.total,
    itemListElement: results.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/properties/${item.slug}`,
      name: item.title,
    })),
  };

  return (
    <div className="container-page py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-5">
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-700">
            Home
          </Link>
          <span aria-hidden> / </span>
          <span className="text-slate-700">Housing</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Student housing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every listing shows its advertised rent, fees and distance to campus. Sorting options are
          plain and disclosed — there is no hidden &ldquo;best&rdquo; ranking and search is never
          paywalled.
        </p>
      </header>

      {invalidFilters && (
        <Alert variant="warning" className="mb-4">
          Some filters in this link were invalid and have been ignored. Showing all listings that
          match the remaining filters.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Suspense fallback={<Skeleton className="hidden h-96 rounded-xl lg:block" />}>
          <FilterPanel
            key={paramsKey}
            universities={universities}
            cities={cities.map((c) => c.city)}
            neighborhoods={neighborhoods}
          />
        </Suspense>

        <div className="min-w-0">
          <Suspense fallback={<Skeleton className="h-10 w-full rounded-lg" />}>
            <ResultsToolbar
              total={results.total}
              page={results.page}
              totalPages={results.totalPages}
              view={view}
            />
          </Suspense>

          {results.items.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={<SearchX className="h-10 w-10" aria-hidden />}
              title="No listings match these filters"
              description="Try widening your rent range, removing an amenity, or searching a different area. New listings are added by landlords and caretakers every day."
              action={
                <Button asChild variant="outline">
                  <Link href="/properties">Clear all filters</Link>
                </Button>
              }
            />
          ) : view === "map" ? (
            <div className="mt-4">
              <MapResults
                points={points}
                provider={mapConfig.provider}
                token={mapConfig.token}
                centerName={campus?.name ?? null}
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {results.items.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isFavorited={favoriteIds.has(property.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className={
                view === "grid"
                  ? "mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  : "mt-4 flex flex-col gap-4"
              }
            >
              {results.items.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  layout={view}
                  isFavorited={favoriteIds.has(property.id)}
                />
              ))}
            </div>
          )}

          <Pagination page={results.page} totalPages={results.totalPages} hrefFor={hrefFor} />

          {results.total === 0 && (
            <p className="mt-6 text-center text-sm text-slate-500">
              Are you a landlord or caretaker?{" "}
              <Link href="/register?role=LANDLORD" className="font-semibold text-brand-700 hover:underline">
                Add the first listing
              </Link>{" "}
              <HomeIcon className="inline h-3.5 w-3.5" aria-hidden />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
