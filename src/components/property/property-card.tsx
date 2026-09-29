import Link from "next/link";
import Image from "next/image";
import { MapPin, BadgeCheck, Home as HomeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { FavoriteButton } from "@/components/property/favorite-button";
import { formatNaira, formatDistance } from "@/lib/utils";
import { FEATURED_EXPLAINER, PROPERTY_TYPE_LABELS, RENT_PERIOD_LABELS } from "@/lib/constants";
import type { PropertyCard as PropertyCardData } from "@/lib/services/search.service";

interface PropertyCardProps {
  property: PropertyCardData;
  isFavorited?: boolean;
  layout?: "grid" | "list";
}

export function PropertyCard({ property, isFavorited = false, layout = "grid" }: PropertyCardProps) {
  const cover = property.images[0];
  const verified = property.verificationStatus === "VERIFIED";

  return (
    <article
      className={
        layout === "grid"
          ? "group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          : "group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:flex-row"
      }
    >
      <Link
        href={`/properties/${property.slug}`}
        className={layout === "grid" ? "relative block aspect-[4/3] w-full overflow-hidden bg-slate-100" : "relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 sm:aspect-auto sm:w-64 sm:shrink-0"}
        tabIndex={-1}
        aria-hidden
      >
        {cover ? (
          <Image
            src={cover.thumbUrl ?? cover.url}
            alt={cover.alt ?? property.title}
            fill
            sizes={layout === "grid" ? "(max-width: 640px) 100vw, 33vw" : "256px"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300">
            <HomeIcon className="h-10 w-10" aria-hidden />
          </span>
        )}
        {property.isFeatured && (
          <Badge variant="accent" className="absolute left-2 top-2 shadow" title={FEATURED_EXPLAINER}>
            Featured
          </Badge>
        )}
      </Link>

      <div className="absolute right-2 top-2">
        <FavoriteButton propertyId={property.id} initial={isFavorited} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-900">
            <Link href={`/properties/${property.slug}`} className="hover:text-brand-700 focus-visible:text-brand-700">
              {property.title}
            </Link>
          </h3>
          {verified && (
            <Badge variant="verified" className="shrink-0" title="Details confirmed by our team">
              <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
            </Badge>
          )}
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {property.areaName}
            {property.campus ? ` · ${property.campus.name}` : ""}
          </span>
        </p>

        <p className="mt-2 text-lg font-bold text-slate-900">
          {formatNaira(property.rentAmount)}
          <span className="text-sm font-normal text-slate-500"> / {RENT_PERIOD_LABELS[property.rentPeriod]}</span>
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{PROPERTY_TYPE_LABELS[property.propertyType]}</span>
          {property.distanceKmToCampus !== null && (
            <span>{formatDistance(Number(property.distanceKmToCampus))}</span>
          )}
          {!property.availableNow && <span className="font-medium text-amber-600">Not available now</span>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          {property.reviewCount > 0 ? (
            <StarRating value={property.avgRating} size="sm" showValue count={property.reviewCount} />
          ) : (
            <span className="text-xs text-slate-400">No reviews yet</span>
          )}
          <span className="text-xs capitalize text-slate-400">{property.providerType.toLowerCase()}</span>
        </div>
      </div>
    </article>
  );
}
