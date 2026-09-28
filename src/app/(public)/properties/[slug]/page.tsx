import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  BedDouble,
  Bath,
  Users,
  MapPin,
  Ruler,
  ShieldAlert,
  Sofa,
  CalendarCheck,
  Eye,
  Heart,
  Sparkles,
  Wifi,
  Droplets,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { getPropertyBySlug, PropertyNotFoundError } from "@/lib/services/property.service";
import { listPropertyReviews } from "@/lib/services/review.service";
import { isUserVerified } from "@/lib/services/verification.service";
import { interactiveMapConfig } from "@/lib/services/maps.service";
import { searchProperties } from "@/lib/services/search.service";
import { PropertyGallery } from "@/components/property/property-gallery";
import { FavoriteButton } from "@/components/property/favorite-button";
import { ShareButton } from "@/components/property/share-button";
import { InquiryForm } from "@/components/property/inquiry-form";
import {
  MessageOwnerButton,
  MessageOwnerLoginLink,
} from "@/components/property/message-owner-button";
import { MapResults } from "@/components/search/map-results";
import { ReviewsSection, type CategoryAverage } from "@/components/reviews/reviews-section";
import type { ReviewCardData } from "@/components/reviews/review-card";
import { PropertyCard } from "@/components/property/property-card";
import { ReportDialog } from "@/components/report/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/ui/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AMENITY_LABELS,
  FLOOD_RISK_LABELS,
  FURNISHING_LABELS,
  INTERNET_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  PROVIDER_TYPE_LABELS,
  RENT_PERIOD_LABELS,
  SAFETY_WARNING,
  SECURITY_FEATURE_LABELS,
  SITE_NAME,
  VERIFICATION_EXPLAINER,
  WATER_SOURCE_LABELS,
} from "@/lib/constants";
import { formatDate, formatDistance, formatNaira, initials } from "@/lib/utils";
import type { AmenityKey, ReviewCategory } from "@/lib/types";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { property } = await getPropertyBySlug(slug, null);
    const title = `${property.title} — ${property.areaName}`;
    const description = `${PROPERTY_TYPE_LABELS[property.propertyType]} for students in ${property.areaName}, ${property.city}. Rent ${formatNaira(property.rentAmount)} per ${RENT_PERIOD_LABELS[property.rentPeriod]}.`;
    return {
      title,
      description,
      alternates: { canonical: `/properties/${property.slug}` },
      openGraph: {
        title: `${title} | ${SITE_NAME}`,
        description,
        type: "article",
        images: property.images.slice(0, 4).map((image) => ({ url: image.url })),
      },
    };
  } catch {
    return { title: "Listing not found" };
  }
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const viewer = await getSessionUser();

  let data: Awaited<ReturnType<typeof getPropertyBySlug>>;
  try {
    data = await getPropertyBySlug(slug, viewer);
  } catch (error) {
    if (error instanceof PropertyNotFoundError) notFound();
    throw error;
  }

  const { property, isFavorited, showExactAddress, ownerStats } = data;

  const reviewsPageRaw = typeof search.reviewsPage === "string" ? Number(search.reviewsPage) : 1;
  const reviewsPage = Number.isFinite(reviewsPageRaw) && reviewsPageRaw > 0 ? reviewsPageRaw : 1;

  const [reviewData, verificationBreakdown, ownerVerified, similar, myInquiries, existingReview] =
    await Promise.all([
      listPropertyReviews(property.id, reviewsPage, 5),
      prisma.review.groupBy({
        by: ["verification"],
        where: { propertyId: property.id, status: "PUBLISHED", deletedAt: null },
        _count: { _all: true },
      }),
      isUserVerified(property.ownerId),
      searchProperties({
        page: 1,
        pageSize: 3,
        sort: "newest",
        amenities: [],
        universityId: property.universityId,
      }),
      viewer?.role === "STUDENT"
        ? prisma.inquiry.findMany({
            where: {
              propertyId: property.id,
              studentId: viewer.id,
              status: { in: ["RESPONDED", "VIEWING_SCHEDULED", "CLOSED"] },
            },
            select: { id: true, type: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
      viewer
        ? prisma.review.findFirst({
            where: { propertyId: property.id, authorId: viewer.id, deletedAt: null },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

  const isOwner = viewer?.id === property.ownerId;
  const mapConfig = interactiveMapConfig();

  const reviews: ReviewCardData[] = reviewData.items.map((review) => ({
    id: review.id,
    overallRating: review.overallRating,
    title: review.title,
    body: review.body ?? "",
    verification: review.verification,
    createdAt: review.createdAt.toISOString(),
    dateStayedFrom: review.dateStayedFrom ? review.dateStayedFrom.toISOString() : null,
    stayDurationMonths: review.stayDurationMonths,
    authorName: review.author.name,
    authorAvatar: review.author.profile?.avatarUrl ?? null,
    categoryRatings: review.categoryRatings.map((c) => ({
      category: c.category as ReviewCategory,
      rating: c.rating,
    })),
    response: review.response ? { body: review.response.body } : null,
  }));

  const categoryAverages: CategoryAverage[] = reviewData.categoryAverages.map((entry) => ({
    category: entry.category as ReviewCategory,
    avg: entry._avg.rating ?? 0,
    count: entry._count.rating,
  }));

  const verificationCounts = Object.fromEntries(
    verificationBreakdown.map((entry) => [entry.verification, entry._count._all]),
  );

  const totalFirstPayment =
    property.rentAmount +
    (property.cautionDeposit ?? 0) +
    (property.agencyFee ?? 0) +
    (property.serviceCharge ?? 0);

  const similarItems = similar.items.filter((item) => item.id !== property.id).slice(0, 3);

  const images = property.images.map((image) => ({
    url: image.url,
    thumbUrl: image.thumbUrl,
    alt: image.alt,
  }));

  const condition = property.condition;
  const amenities = property.amenities.map((a) => a.key as AmenityKey);

  const mapPoints =
    property.latitude !== null && property.longitude !== null
      ? [
          {
            id: property.id,
            slug: property.slug,
            title: property.title,
            rentAmount: property.rentAmount,
            rentPeriod: property.rentPeriod,
            latitude: Number(property.latitude),
            longitude: Number(property.longitude),
            locationApproximate: property.locationApproximate,
            verificationStatus: property.verificationStatus,
            image: images[0]?.thumbUrl ?? images[0]?.url ?? null,
          },
        ]
      : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: property.title,
    description: property.description.slice(0, 500),
    address: {
      "@type": "PostalAddress",
      addressLocality: property.areaName,
      addressRegion: property.state,
      addressCountry: "NG",
    },
    ...(property.latitude !== null && property.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: Number(property.latitude),
            longitude: Number(property.longitude),
          },
        }
      : {}),
    numberOfRooms: property.bedrooms,
    ...(property.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: property.avgRating.toFixed(1),
            reviewCount: property.reviewCount,
            bestRating: 5,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: property.rentAmount,
      priceCurrency: "NGN",
      availability: property.availableNow
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      url: `/properties/${property.slug}`,
    },
  };

  const reviewsHrefFor = (page: number) => {
    const sp = new URLSearchParams(
      Object.entries(search).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value === "string") acc[key] = value;
        return acc;
      }, {}),
    );
    sp.set("reviewsPage", String(page));
    return `/properties/${property.slug}?${sp.toString()}#reviews`;
  };

  return (
    <div className="container-page py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span aria-hidden> / </span>
        <Link href="/properties" className="hover:text-brand-700">
          Housing
        </Link>
        <span aria-hidden> / </span>
        <Link
          href={`/properties?university=${encodeURIComponent(property.university.shortName)}`}
          className="hover:text-brand-700"
        >
          {property.university.shortName}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-slate-700">{property.title}</span>
      </nav>

      <header className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{property.title}</h1>
              {property.verificationStatus === "VERIFIED" && (
                <Badge variant="verified" title={VERIFICATION_EXPLAINER}>
                  <BadgeCheck className="h-3 w-3" aria-hidden /> Verified listing
                </Badge>
              )}
              {property.isFeatured && (
                <Badge variant="accent">
                  <Sparkles className="h-3 w-3" aria-hidden /> Featured
                </Badge>
              )}
              {!property.availableNow && <Badge variant="pending">Not available now</Badge>}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
                {property.areaName}, {property.city}, {property.state}
              </span>
              {property.distanceKmToCampus !== null && (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="h-4 w-4 text-brand-600" aria-hidden />
                  {formatDistance(Number(property.distanceKmToCampus))}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Eye className="h-4 w-4 text-slate-400" aria-hidden />
                {property.viewCount.toLocaleString("en-NG")} views
              </span>
              {property.reviewCount > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-1 hover:underline">
                  <StarRating value={property.avgRating} size="sm" showValue count={property.reviewCount} />
                </a>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <FavoriteButton propertyId={property.id} initial={isFavorited} className="relative" />
            <ShareButton url={`/properties/${property.slug}`} title={property.title} />
            <ReportDialog
              targetType="PROPERTY"
              targetId={property.id}
              label="Report"
              variant="outline"
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <PropertyGallery images={images} title={property.title} />

          <section aria-labelledby="facts-heading">
            <h2 id="facts-heading" className="sr-only">
              Key facts
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact icon={<BedDouble className="h-4 w-4" aria-hidden />} label="Type" value={PROPERTY_TYPE_LABELS[property.propertyType]} />
              <Fact icon={<BedDouble className="h-4 w-4" aria-hidden />} label="Bedrooms" value={String(property.bedrooms)} />
              <Fact icon={<Bath className="h-4 w-4" aria-hidden />} label="Bathrooms" value={String(property.bathrooms)} />
              <Fact icon={<Users className="h-4 w-4" aria-hidden />} label="Max occupants" value={String(property.maxOccupants)} />
              <Fact icon={<Sofa className="h-4 w-4" aria-hidden />} label="Furnishing" value={FURNISHING_LABELS[property.furnishing]} />
              <Fact
                icon={<CalendarCheck className="h-4 w-4" aria-hidden />}
                label="Available"
                value={
                  property.availableNow
                    ? "Now"
                    : property.availableFrom
                      ? `From ${formatDate(property.availableFrom)}`
                      : "Not available"
                }
              />
            </ul>
          </section>

          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="text-lg font-bold text-slate-900">
              About this place
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {property.description}
            </p>
            {property.houseRules && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-800">House rules</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{property.houseRules}</p>
              </div>
            )}
          </section>

          {amenities.length > 0 && (
            <section aria-labelledby="amenities-heading">
              <h2 id="amenities-heading" className="text-lg font-bold text-slate-900">
                Amenities
              </h2>
              <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {amenities.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-slate-700">
                    <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    {AMENITY_LABELS[key]}
                  </li>
                ))}
              </ul>
              {property.features.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {property.features.map((feature) => (
                    <li
                      key={feature.id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                    >
                      {feature.label}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {condition && (
            <section aria-labelledby="conditions-heading">
              <h2 id="conditions-heading" className="text-lg font-bold text-slate-900">
                Living conditions
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Reported by the owner or caretaker and, where available, cross-checked against
                student reviews. Ratings are self-reported estimates on a 1–5 scale — treat them as
                a starting point, not a guarantee.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ConditionCard
                  icon={<Zap className="h-4 w-4" aria-hidden />}
                  title="Electricity"
                  rows={[
                    ["Supply", condition.electricityAvailable ? "Yes" : "No"],
                    ["Generator", condition.generatorAvailable ? "Available" : "Not available"],
                    ["Solar", condition.solarAvailable ? "Available" : "Not available"],
                    ["Prepaid meter", condition.prepaidMeter ? "Yes" : "No / not stated"],
                    ["Reliability (owner estimate)", ratingLabel(condition.electricityReliability)],
                  ]}
                />
                <ConditionCard
                  icon={<Droplets className="h-4 w-4" aria-hidden />}
                  title="Water"
                  rows={[
                    ["Source", WATER_SOURCE_LABELS[condition.waterSource]],
                    ["Reliability (owner estimate)", ratingLabel(condition.waterReliability)],
                    ["Flood risk", FLOOD_RISK_LABELS[condition.floodRisk]],
                  ]}
                />
                <ConditionCard
                  icon={<Wifi className="h-4 w-4" aria-hidden />}
                  title="Internet & access"
                  rows={[
                    ["Internet", INTERNET_TYPE_LABELS[condition.internetType]],
                    ["Network quality (owner estimate)", ratingLabel(condition.networkQuality)],
                    ["Road condition (owner estimate)", ratingLabel(condition.roadCondition)],
                  ]}
                />
                <ConditionCard
                  icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
                  title="Security & environment"
                  rows={[
                    [
                      "Features",
                      condition.securityFeatures.length > 0
                        ? condition.securityFeatures.map((f) => SECURITY_FEATURE_LABELS[f]).join(", ")
                        : "None stated",
                    ],
                    ["Noise level (1 = quiet)", ratingLabel(condition.noiseLevel)],
                    ["Cleanliness (owner estimate)", ratingLabel(condition.cleanliness)],
                  ]}
                />
              </div>
            </section>
          )}

          <section aria-labelledby="location-heading">
            <h2 id="location-heading" className="text-lg font-bold text-slate-900">
              Location
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {property.areaName}, {property.city}, {property.state}
              {property.campus ? ` · near ${property.campus.name}` : ""}
              {property.distanceKmToCampus !== null
                ? ` · ${formatDistance(Number(property.distanceKmToCampus))}`
                : " · distance to campus not measured"}
            </p>

            {showExactAddress && property.addressLine && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Private — owner/admin view only:</strong> {property.addressLine}
              </p>
            )}

            {property.locationApproximate && (
              <p className="mt-2 text-xs text-slate-500">
                The owner chose to publish an approximate location. The exact address is shared after
                you make contact.
              </p>
            )}

            <div className="mt-3">
              <MapResults
                points={mapPoints}
                provider={mapConfig.provider}
                token={mapConfig.token}
                centerName={property.campus?.name ?? null}
              />
            </div>
          </section>

          <Separator />

          <ReviewsSection
            propertyId={property.id}
            reviews={reviews}
            categoryAverages={categoryAverages}
            avgRating={property.avgRating}
            reviewCount={property.reviewCount}
            total={reviewData.total}
            page={reviewData.page}
            totalPages={Math.max(1, Math.ceil(reviewData.total / reviewData.pageSize))}
            hrefFor={reviewsHrefFor}
            verificationCounts={verificationCounts}
            viewer={{
              signedIn: Boolean(viewer),
              isStudent: viewer?.role === "STUDENT",
              isOwner,
              hasReviewed: Boolean(existingReview),
            }}
            inquiries={myInquiries.map((inquiry) => ({
              id: inquiry.id,
              label: `${inquiry.type.replaceAll("_", " ").toLowerCase()} · ${formatDate(inquiry.createdAt)}`,
            }))}
          />
        </div>

        {/* Sticky contact + pricing panel */}
        <div className="lg:relative">
          <div className="space-y-4 lg:sticky lg:top-20">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-baseline gap-1 text-2xl">
                  {formatNaira(property.rentAmount)}
                  <span className="text-sm font-normal text-slate-500">
                    / {RENT_PERIOD_LABELS[property.rentPeriod]}
                  </span>
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Listed by a {PROVIDER_TYPE_LABELS[property.providerType].toLowerCase()} ·{" "}
                  {formatDate(property.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Advertised charges
                  </h3>
                  <dl className="mt-2 space-y-1 text-sm">
                    <ChargeRow label={`Rent (${RENT_PERIOD_LABELS[property.rentPeriod]})`} value={property.rentAmount} />
                    <ChargeRow label="Caution deposit" value={property.cautionDeposit} />
                    <ChargeRow label="Agency fee" value={property.agencyFee} />
                    <ChargeRow label="Service charge" value={property.serviceCharge} />
                  </dl>
                  <Separator className="my-2" />
                  <p className="flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>Total if all apply</span>
                    <span>{formatNaira(totalFirstPayment)}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sum of the charges the owner advertised. Confirm in writing before paying —
                    StudentNest does not collect rent and never asks you to pay through this site.
                  </p>
                </div>

                <InquiryForm
                  propertyId={property.id}
                  propertyTitle={property.title}
                  viewer={{
                    signedIn: Boolean(viewer),
                    isStudent: viewer?.role === "STUDENT",
                    isOwner,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  About the lister
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    {property.owner.profile?.avatarUrl ? (
                      <AvatarImage src={property.owner.profile.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>{initials(property.owner.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{property.owner.name}</p>
                    <p className="text-xs text-slate-500">
                      {PROVIDER_TYPE_LABELS[property.providerType]} · joined{" "}
                      {formatDate(property.owner.createdAt)}
                    </p>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-center justify-between gap-2">
                    <span>Identity verification</span>
                    {ownerVerified ? (
                      <Badge variant="verified">
                        <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Not verified</Badge>
                    )}
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Active listings</span>
                    <span className="font-semibold text-slate-900">{ownerStats.listingCount}</span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Inquiries answered</span>
                    <span className="font-semibold text-slate-900">
                      {ownerStats.responseRate === null ? "No inquiries yet" : `${ownerStats.responseRate}%`}
                    </span>
                  </li>
                </ul>

                <p className="text-xs text-slate-500">
                  Identity documents are reviewed privately by our team and never published.
                  Verification is not a guarantee — always inspect before paying.
                </p>

                {!isOwner &&
                  (viewer ? (
                    <MessageOwnerButton
                      ownerId={property.owner.id}
                      ownerName={property.owner.name}
                      propertyId={property.id}
                      propertyTitle={property.title}
                    />
                  ) : (
                    <MessageOwnerLoginLink href={`/login?callbackUrl=/properties/${property.slug}`} />
                  ))}
              </CardContent>
            </Card>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <ShieldAlert className="h-4 w-4" aria-hidden />
                Before you pay
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-amber-900">{SAFETY_WARNING}</p>
              <Link
                href="/safety"
                className="mt-2 inline-block text-xs font-semibold text-amber-900 underline underline-offset-2"
              >
                Read the full safety guide
              </Link>
            </div>
          </div>
        </div>
      </div>

      {similarItems.length > 0 && (
        <section className="mt-12" aria-labelledby="similar-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="similar-heading" className="text-xl font-bold text-slate-900">
                Similar listings near {property.university.shortName}
              </h2>
              <p className="text-sm text-slate-500">Same university, sorted by newest listing date</p>
            </div>
            <Link
              href={`/properties?universityId=${property.universityId}`}
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similarItems.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Heart className="h-3.5 w-3.5" aria-hidden />
        {property.favoriteCount.toLocaleString("en-NG")} students saved this listing
      </p>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-semibold text-slate-900">{value}</span>
    </li>
  );
}

function ConditionCard({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="text-brand-600">{icon}</span>
        {title}
      </h3>
      <dl className="mt-2 space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ChargeRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className={value === null ? "text-xs text-slate-400" : "font-medium text-slate-900"}>
        {value === null ? "Not stated" : formatNaira(value)}
      </dd>
    </div>
  );
}

function ratingLabel(value: number | null): string {
  if (value === null) return "Not stated";
  return `${value}/5`;
}
