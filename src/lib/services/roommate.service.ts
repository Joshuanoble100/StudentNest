import { prisma } from "@/lib/prisma";
import type { RoommateProfileInput, RoommatePreferenceInput } from "@/lib/validation/roommate";
import {
  computeCompatibility,
  DEFAULT_WEIGHTS,
  type MatchingWeights,
} from "./matching.service";
import { createNotification } from "./notification.service";

export class RoommateError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function toGenderEnum(pref: "MALE" | "FEMALE" | "ANY" | null | undefined) {
  return pref === "MALE" || pref === "FEMALE" ? pref : null;
}

export async function upsertRoommateProfile(userId: string, input: RoommateProfileInput) {
  const data = {
    universityId: input.universityId,
    campusId: input.campusId ?? null,
    preferredLocations: input.preferredLocations,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    preferredRoomType: input.preferredRoomType ?? null,
    desiredRoommates: input.desiredRoommates,
    genderPreference: toGenderEnum(input.genderPreference),
    smoking: input.smoking,
    pets: input.pets,
    cleanliness: input.cleanliness,
    sleepSchedule: input.sleepSchedule,
    studyHabits: input.studyHabits,
    socialPreference: input.socialPreference,
    noiseTolerance: input.noiseTolerance,
    moveInDate: input.moveInDate,
    bio: input.bio ?? null,
    status: input.status,
  };

  const profile = await prisma.roommateProfile.upsert({
    where: { userId },
    create: {
      ...data,
      userId,
      preference: { create: {} },
    },
    update: data,
    include: { university: { select: { shortName: true, name: true } }, campus: { select: { name: true } } },
  });

  if (input.gender !== undefined) {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, gender: input.gender ?? null },
      update: { gender: input.gender ?? null },
    });
  }

  return profile;
}

export async function updateMatchingPreference(userId: string, input: RoommatePreferenceInput) {
  const profile = await prisma.roommateProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new RoommateError("Create a roommate profile first", 404);
  return prisma.roommatePreference.upsert({
    where: { roommateProfileId: profile.id },
    create: { roommateProfileId: profile.id, ...input },
    update: input,
  });
}

export async function getMyRoommateProfile(userId: string) {
  return prisma.roommateProfile.findUnique({
    where: { userId },
    include: {
      university: { select: { id: true, shortName: true, name: true } },
      campus: { select: { id: true, name: true } },
      preference: true,
    },
  });
}

/**
 * Browse roommate profiles, optionally ranked by compatibility with the
 * viewer's own profile. Explicit user-chosen filters (including their own
 * gender preference) are applied transparently; the compatibility score
 * itself never uses protected traits.
 */
export async function listRoommates(
  viewerId: string | null,
  filters: {
    universityId?: string;
    budgetMin?: number;
    budgetMax?: number;
    smoking?: boolean;
    genderPreference?: "MALE" | "FEMALE" | "ANY";
    page?: number;
    pageSize?: number;
  } = {},
) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 12, 50);

  const viewer = viewerId
    ? await prisma.roommateProfile.findUnique({
        where: { userId: viewerId },
        include: { preference: true },
      })
    : null;

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (viewer) where.userId = { not: viewerId };
  if (filters.universityId) where.universityId = filters.universityId;
  if (filters.budgetMax !== undefined) where.budgetMin = { lte: filters.budgetMax };
  if (filters.budgetMin !== undefined) where.budgetMax = { gte: filters.budgetMin };
  if (filters.smoking !== undefined) where.smoking = filters.smoking;
  if (filters.genderPreference && filters.genderPreference !== "ANY") {
    // Explicit user-selected filter on the profile owner's stated gender.
    where.user = { profile: { gender: filters.genderPreference } };
  }

  const [rows, total] = await Promise.all([
    prisma.roommateProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, createdAt: true, profile: { select: { avatarUrl: true, gender: true } } } },
        university: { select: { shortName: true, name: true } },
        campus: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: viewer ? 200 : pageSize, // rank locally when scoring
      skip: viewer ? 0 : (page - 1) * pageSize,
    }),
    prisma.roommateProfile.count({ where }),
  ]);

  const weights: MatchingWeights = viewer?.preference ?? DEFAULT_WEIGHTS;

  let items = rows.map((row) => ({
    ...row,
    compatibility: viewer ? computeCompatibility(viewer, row, weights) : null,
  }));

  if (viewer) {
    items.sort((a, b) => (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0));
    const start = (page - 1) * pageSize;
    items = items.slice(start, start + pageSize);
  }

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function toggleFavoriteRoommate(userId: string, roommateProfileId: string) {
  const existing = await prisma.favoriteRoommate.findUnique({
    where: { userId_roommateProfileId: { userId, roommateProfileId } },
  });
  if (existing) {
    await prisma.favoriteRoommate.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  await prisma.favoriteRoommate.create({ data: { userId, roommateProfileId } });

  const target = await prisma.roommateProfile.findUnique({
    where: { id: roommateProfileId },
    select: { userId: true },
  });
  if (target) {
    await createNotification({
      userId: target.userId,
      type: "ROOMMATE_MATCH",
      title: "Someone saved your roommate profile",
      body: "A student is interested in matching with you.",
      link: "/dashboard/student/roommates",
    });
  }
  return { favorited: true };
}
