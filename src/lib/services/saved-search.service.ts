import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { savedSearchSchema, propertySearchSchema } from "@/lib/validation/property";
import { buildPropertyWhere } from "./search.service";
import { createNotification } from "./notification.service";

export class SavedSearchError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_SAVED_SEARCHES_PER_USER = 25;

export async function listSavedSearches(userId: string) {
  return prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, query: true, createdAt: true },
  });
}

export async function createSavedSearch(userId: string, input: unknown) {
  const data = savedSearchSchema.parse(input);

  const count = await prisma.savedSearch.count({ where: { userId } });
  if (count >= MAX_SAVED_SEARCHES_PER_USER) {
    throw new SavedSearchError(
      `You can save up to ${MAX_SAVED_SEARCHES_PER_USER} searches. Delete one first.`,
      409,
    );
  }

  // Re-validate the stored query with the public search schema so a saved
  // search can never encode filters the search endpoint would reject.
  const normalized = propertySearchSchema.parse({ ...data.query, page: 1 });
  const { page: _page, pageSize: _pageSize, ...query } = normalized;

  return prisma.savedSearch.create({
    data: {
      userId,
      name: data.name,
      query: query as Prisma.InputJsonValue,
    },
    select: { id: true, name: true, query: true, createdAt: true },
  });
}

export async function deleteSavedSearch(userId: string, id: string) {
  const result = await prisma.savedSearch.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new SavedSearchError("Saved search not found", 404);
}

/**
 * Notifies users whose saved searches match a newly activated listing.
 * Runs a real query per saved search (bounded) so matches are never guessed.
 */
export async function notifyMatchingSavedSearches(propertyId: string): Promise<number> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { slug: true, title: true },
  });
  if (!property) return 0;

  const searches = await prisma.savedSearch.findMany({
    select: { id: true, name: true, query: true, userId: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  let notified = 0;
  for (const search of searches) {
    const parsed = propertySearchSchema.safeParse({
      ...(search.query as Record<string, unknown>),
      page: 1,
      pageSize: 1,
    });
    if (!parsed.success) continue;

    const matches = await prisma.property.count({
      where: { ...buildPropertyWhere(parsed.data), id: propertyId },
    });
    if (matches === 0) continue;

    await createNotification({
      userId: search.userId,
      type: "NEW_MATCHING_PROPERTY",
      title: "New listing matches your saved search",
      body: `${property.title} matches "${search.name}".`,
      link: `/properties/${property.slug}`,
    });
    notified += 1;
  }
  return notified;
}
