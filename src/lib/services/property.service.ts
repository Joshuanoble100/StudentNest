import { prisma } from "@/lib/prisma";
import { slugify, distanceKm } from "@/lib/utils";
import type { PropertyCreateInput, PropertyUpdateInput } from "@/lib/validation/property";
import { auditLog } from "./audit.service";
import { createNotification } from "./notification.service";

export class PropertyNotFoundError extends Error {
  status = 404;
  constructor(slugOrId: string) {
    super(`Property not found: ${slugOrId}`);
  }
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const stem = slugify(base) || "property";
  let candidate = stem;
  let counter = 2;
  // Bounded loop; collisions beyond this are practically impossible.
  for (;;) {
    const existing = await prisma.property.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${stem}-${counter++}`;
  }
}

async function computeDistanceToCampus(
  campusId: string | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Promise<number | null> {
  if (!campusId || latitude == null || longitude == null) return null;
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { latitude: true, longitude: true },
  });
  if (!campus?.latitude || !campus?.longitude) return null;
  return distanceKm(latitude, longitude, Number(campus.latitude), Number(campus.longitude));
}

function splitInput(input: PropertyCreateInput | PropertyUpdateInput) {
  const { amenities, features, condition, images, ...rest } = input as PropertyCreateInput;
  return { rest, amenities, features, condition, images };
}

export async function createProperty(
  ownerId: string,
  ownerEmail: string,
  input: PropertyCreateInput,
) {
  const { rest, amenities, features, condition, images } = splitInput(input);
  const slug = await ensureUniqueSlug(`${input.title}-${input.areaName}`);
  const distance = await computeDistanceToCampus(input.campusId, input.latitude, input.longitude);

  const property = await prisma.property.create({
    data: {
      ...rest,
      availableFrom: input.availableFrom ?? null,
      cautionDeposit: input.cautionDeposit ?? null,
      agencyFee: input.agencyFee ?? null,
      serviceCharge: input.serviceCharge ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      slug,
      ownerId,
      status: input.submitForReview ? "PENDING_REVIEW" : "DRAFT",
      distanceKmToCampus: distance,
      amenities: { create: amenities.map((key) => ({ key })) },
      features: { create: features.map((label) => ({ label })) },
      condition: condition ? { create: condition } : undefined,
      images: {
        create: images.map((img, idx) => ({
          url: img.url,
          alt: img.alt ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          thumbUrl: img.thumbUrl ?? null,
          sortOrder: img.sortOrder ?? idx,
          isCover: img.isCover,
        })),
      },
      verifications: {
        create: { status: "PENDING", submittedById: ownerId },
      },
    },
    select: { id: true, slug: true, status: true },
  });

  await auditLog({
    actorId: ownerId,
    actorEmail: ownerEmail,
    action: "property.create",
    entityType: "Property",
    entityId: property.id,
    metadata: { status: property.status, providerType: input.providerType },
  });

  return property;
}

export async function updateProperty(
  actor: { id: string; email: string },
  propertyId: string,
  input: PropertyUpdateInput,
) {
  const existing = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, ownerId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) throw new PropertyNotFoundError(propertyId);
  if (existing.ownerId !== actor.id) {
    throw Object.assign(new Error("You can only edit your own listings"), { status: 403 });
  }

  const { rest, amenities, features, condition, images } = splitInput(input);
  const distance =
    input.latitude !== undefined || input.longitude !== undefined || input.campusId !== undefined
      ? await computeDistanceToCampus(
          input.campusId ?? undefined,
          input.latitude ?? undefined,
          input.longitude ?? undefined,
        )
      : undefined;

  const property = await prisma.$transaction(async (tx) => {
    if (images) {
      const toDelete = await tx.propertyImage.findMany({
        where: { propertyId, url: { notIn: images.map((i) => i.url) } },
        select: { url: true, thumbUrl: true },
      });
      await tx.propertyImage.deleteMany({ where: { propertyId } });
      await tx.propertyImage.createMany({
        data: images.map((img, idx) => ({
          propertyId,
          url: img.url,
          alt: img.alt ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          thumbUrl: img.thumbUrl ?? null,
          sortOrder: img.sortOrder ?? idx,
          isCover: img.isCover,
        })),
      });
      // fire-and-forget cleanup of removed files
      const { deleteImage } = await import("./storage.service");
      for (const img of toDelete) {
        deleteImage(img.url).catch(() => {});
        if (img.thumbUrl) deleteImage(img.thumbUrl).catch(() => {});
      }
    }
    if (amenities) {
      await tx.propertyAmenity.deleteMany({ where: { propertyId } });
      await tx.propertyAmenity.createMany({
        data: amenities.map((key) => ({ propertyId, key })),
      });
    }
    if (features) {
      await tx.propertyFeature.deleteMany({ where: { propertyId } });
      await tx.propertyFeature.createMany({ data: features.map((label) => ({ propertyId, label })) });
    }
    if (condition) {
      await tx.propertyCondition.upsert({
        where: { propertyId },
        create: { ...condition, propertyId },
        update: condition,
      });
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (distance !== undefined && distance !== null) updateData.distanceKmToCampus = distance;
    // Any substantive edit sends an active listing back for re-review,
    // except simple availability toggles.
    if (input.status === undefined) {
      const current = await tx.property.findUnique({ where: { id: propertyId }, select: { status: true } });
      if (current?.status === "ACTIVE" && touchesCoreFields(rest)) {
        updateData.status = "PENDING_REVIEW";
        updateData.verificationStatus = "PENDING";
      }
    }

    return tx.property.update({
      where: { id: propertyId },
      data: updateData,
      select: { id: true, slug: true, status: true },
    });
  });

  await auditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "property.update",
    entityType: "Property",
    entityId: propertyId,
    metadata: { fields: Object.keys(rest) },
  });

  return property;
}

function touchesCoreFields(rest: Partial<PropertyCreateInput>): boolean {
  const core: (keyof PropertyCreateInput)[] = [
    "title","description","rentAmount","propertyType","addressLine","areaName",
    "city","state","universityId","campusId","latitude","longitude",
  ];
  return core.some((key) => rest[key] !== undefined);
}

/** Soft delete. Owners can delete their own; admins can delete any. */
export async function softDeleteProperty(
  actor: { id: string; email: string; role: string },
  propertyId: string,
) {
  const existing = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerId: true },
  });
  if (!existing) throw new PropertyNotFoundError(propertyId);
  if (existing.ownerId !== actor.id && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Not allowed"), { status: 403 });
  }
  await prisma.property.update({
    where: { id: propertyId },
    data: { deletedAt: new Date(), status: "DELETED" },
  });
  await auditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "property.delete",
    entityType: "Property",
    entityId: propertyId,
  });
}

const publicPropertyInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  amenities: true,
  features: true,
  condition: true,
  university: { select: { name: true, shortName: true, slug: true } },
  campus: { select: { name: true, slug: true, latitude: true, longitude: true } },
  neighborhood: { select: { name: true, slug: true } },
  owner: {
    select: {
      id: true,
      name: true,
      role: true,
      createdAt: true,
      profile: { select: { avatarUrl: true } },
    },
  },
  reviews: {
    where: { status: "PUBLISHED" as const, deletedAt: null },
    include: {
      author: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
      categoryRatings: true,
      response: { where: { deletedAt: null } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

/**
 * Public property details by SEO slug. Increments view count.
 * Private fields (exact address) are stripped unless viewer is owner/admin.
 */
export async function getPropertyBySlug(
  slug: string,
  viewer?: { id: string; role: string } | null,
) {
  const property = await prisma.property.findUnique({
    where: { slug },
    include: publicPropertyInclude,
  });

  if (!property || property.deletedAt) throw new PropertyNotFoundError(slug);

  const isPrivileged =
    viewer && (viewer.role === "ADMIN" || viewer.id === property.ownerId);

  // Non-privileged viewers only see ACTIVE listings (owners/admins see all).
  if (!isPrivileged && property.status !== "ACTIVE") throw new PropertyNotFoundError(slug);

  await prisma.property.update({
    where: { id: property.id },
    data: { viewCount: { increment: 1 } },
  });

  let isFavorited = false;
  if (viewer) {
    const fav = await prisma.favoriteProperty.findUnique({
      where: {
        userId_propertyId: { userId: viewer.id, propertyId: property.id },
      },
      select: { id: true },
    });
    isFavorited = Boolean(fav);
  }

  // Owner response metrics: share of inquiries answered + median-ish label.
  const [answered, total] = await Promise.all([
    prisma.inquiry.count({ where: { ownerId: property.ownerId, status: { not: "NEW" } } }),
    prisma.inquiry.count({ where: { ownerId: property.ownerId } }),
  ]);

  const listingCount = await prisma.property.count({
    where: { ownerId: property.ownerId, status: "ACTIVE", deletedAt: null },
  });

  return {
    property,
    isFavorited,
    showExactAddress: Boolean(isPrivileged),
    ownerStats: {
      responseRate: total > 0 ? Math.round((answered / total) * 100) : null,
      listingCount,
    },
  };
}

export async function toggleFavorite(userId: string, propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, rentAmount: true, deletedAt: true },
  });
  if (!property || property.deletedAt) throw new PropertyNotFoundError(propertyId);

  const existing = await prisma.favoriteProperty.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favoriteProperty.delete({ where: { id: existing.id } });
    await prisma.property.update({
      where: { id: propertyId },
      data: { favoriteCount: { decrement: 1 } },
    });
    return { favorited: false };
  }

  await prisma.favoriteProperty.create({
    data: { userId, propertyId, savedRentAmount: property.rentAmount },
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: { favoriteCount: { increment: 1 } },
  });
  return { favorited: true };
}

export async function listFavoriteProperties(userId: string) {
  return prisma.favoriteProperty.findMany({
    where: { userId, property: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        include: {
          images: { where: { isCover: true }, take: 1 },
          university: { select: { shortName: true, name: true } },
          campus: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * Notifies users who favorited a property about price drops / availability.
 * Called from admin/owner price updates.
 */
export async function notifyFavoritePriceChange(propertyId: string, newRent: number) {
  const favorites = await prisma.favoriteProperty.findMany({
    where: { propertyId, savedRentAmount: { gt: newRent } },
    select: { userId: true, savedRentAmount: true },
  });
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { title: true, slug: true },
  });
  if (!property) return;

  for (const fav of favorites) {
    await createNotification({
      userId: fav.userId,
      type: "FAVORITE_PRICE_CHANGE",
      title: "Price drop on a saved property",
      body: `${property.title} rent changed from ₦${fav.savedRentAmount.toLocaleString("en-NG")} to ₦${newRent.toLocaleString("en-NG")}.`,
      link: `/properties/${property.slug}`,
    });
    await prisma.favoriteProperty.updateMany({
      where: { userId: fav.userId, propertyId },
      data: { savedRentAmount: newRent },
    });
  }
}
