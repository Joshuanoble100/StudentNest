import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { PropertySearchInput } from "@/lib/validation/property";
import { PAGE_SIZE } from "@/lib/constants";

/**
 * Builds the Prisma WHERE clause from validated search input.
 * Only ACTIVE, non-deleted listings are ever returned publicly.
 */
export function buildPropertyWhere(input: PropertySearchInput): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
  };

  if (input.q) {
    where.OR = [
      { title: { contains: input.q, mode: "insensitive" } },
      { description: { contains: input.q, mode: "insensitive" } },
      { areaName: { contains: input.q, mode: "insensitive" } },
      { city: { contains: input.q, mode: "insensitive" } },
    ];
  }

  if (input.university) {
    where.university = {
      OR: [
        { shortName: { equals: input.university, mode: "insensitive" } },
        { slug: { equals: input.university.toLowerCase(), mode: "insensitive" } },
        { name: { contains: input.university, mode: "insensitive" } },
      ],
    };
  }
  if (input.universityId) where.universityId = input.universityId;
  if (input.campusId) where.campusId = input.campusId;
  if (input.city) where.city = { equals: input.city, mode: "insensitive" };
  if (input.neighborhood) {
    where.neighborhood = {
      OR: [
        { slug: { equals: input.neighborhood.toLowerCase() } },
        { name: { equals: input.neighborhood, mode: "insensitive" } },
      ],
    };
  }

  if (input.minRent !== undefined || input.maxRent !== undefined) {
    where.rentAmount = {};
    if (input.minRent !== undefined) where.rentAmount.gte = input.minRent;
    if (input.maxRent !== undefined) where.rentAmount.lte = input.maxRent;
  }

  if (input.propertyType) where.propertyType = input.propertyType;
  if (input.furnishing) where.furnishing = input.furnishing;
  if (input.bedrooms !== undefined) where.bedrooms = { gte: input.bedrooms };
  if (input.bathrooms !== undefined) where.bathrooms = { gte: input.bathrooms };
  if (input.maxOccupants !== undefined) where.maxOccupants = { gte: input.maxOccupants };
  if (input.providerType) where.providerType = input.providerType;

  if (input.amenities.length > 0) {
    // Every selected amenity must be present (AND of "some" checks).
    where.AND = input.amenities.map((key) => ({ amenities: { some: { key } } }));
  }

  if (input.verified) where.verificationStatus = "VERIFIED";
  if (input.availableNow) where.availableNow = true;
  if (input.minRating !== undefined) {
    where.reviewCount = { gt: 0 };
    where.avgRating = { gte: input.minRating };
  }
  if (input.maxDistanceKm !== undefined) {
    where.distanceKmToCampus = { lte: input.maxDistanceKm };
  }

  return where;
}

function buildOrderBy(sort: PropertySearchInput["sort"]): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "rent_asc":
      return [{ rentAmount: "asc" }];
    case "rent_desc":
      return [{ rentAmount: "desc" }];
    case "closest":
      return [{ distanceKmToCampus: { sort: "asc", nulls: "last" } }];
    case "most_reviewed":
      return [{ reviewCount: "desc" }, { avgRating: "desc" }];
    case "highest_rated":
      return [{ avgRating: "desc" }, { reviewCount: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

export const propertyCardSelect = {
  id: true,
  slug: true,
  title: true,
  areaName: true,
  city: true,
  state: true,
  rentAmount: true,
  rentPeriod: true,
  propertyType: true,
  furnishing: true,
  bedrooms: true,
  bathrooms: true,
  maxOccupants: true,
  availableNow: true,
  availableFrom: true,
  distanceKmToCampus: true,
  verificationStatus: true,
  providerType: true,
  avgRating: true,
  reviewCount: true,
  isFeatured: true,
  createdAt: true,
  images: { where: { isCover: true }, take: 1, select: { url: true, thumbUrl: true, alt: true } },
  university: { select: { shortName: true, name: true, slug: true } },
  campus: { select: { name: true, slug: true } },
} satisfies Prisma.PropertySelect;

export type PropertyCard = Prisma.PropertyGetPayload<{ select: typeof propertyCardSelect }>;

export interface SearchPropertiesResult {
  items: PropertyCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchProperties(
  input: PropertySearchInput,
): Promise<SearchPropertiesResult> {
  const where = buildPropertyWhere(input);
  const pageSize = input.pageSize || PAGE_SIZE;

  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      select: propertyCardSelect,
      orderBy: buildOrderBy(input.sort),
      skip: (input.page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    items,
    total,
    page: input.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Lightweight map view: coordinates + minimal card fields. */
export async function searchPropertiesForMap(input: PropertySearchInput) {
  const where = buildPropertyWhere(input);
  const items = await prisma.property.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      rentAmount: true,
      rentPeriod: true,
      latitude: true,
      longitude: true,
      locationApproximate: true,
      avgRating: true,
      reviewCount: true,
      verificationStatus: true,
      images: { where: { isCover: true }, take: 1, select: { url: true, thumbUrl: true } },
    },
    orderBy: buildOrderBy(input.sort),
    take: 200,
  });
  return items.filter((p) => p.latitude !== null && p.longitude !== null);
}

/** Home page: recent + most reviewed listings and popular areas. */
export async function getHomeData(limit = 6) {
  const [recent, highlyReviewed, neighborhoods, universities, stats] = await Promise.all([
    prisma.property.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: propertyCardSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.property.findMany({
      where: { status: "ACTIVE", deletedAt: null, reviewCount: { gt: 0 } },
      select: propertyCardSelect,
      orderBy: [{ reviewCount: "desc" }, { avgRating: "desc" }],
      take: limit,
    }),
    prisma.neighborhood.findMany({
      orderBy: { name: "asc" },
      take: 8,
      include: {
        _count: { select: { properties: { where: { status: "ACTIVE", deletedAt: null } } } },
      },
    }),
    prisma.university.findMany({
      orderBy: { name: "asc" },
      take: 10,
      include: {
        _count: { select: { properties: { where: { status: "ACTIVE", deletedAt: null } } } },
      },
    }),
    prisma.property.count({ where: { status: "ACTIVE", deletedAt: null } }),
  ]);
  return { recent, highlyReviewed, neighborhoods, universities, totalActiveListings: stats };
}
