import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getMyRoommateProfile } from "@/lib/services/roommate.service";
import { PageHeader } from "@/components/account/page-header";
import {
  RoommateProfileForm,
  type RoommateFormInitial,
} from "@/components/roommate/roommate-profile-form";
import { MatchingWeightsForm } from "@/components/roommate/matching-weights-form";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEIGHTS } from "@/lib/services/matching.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Roommate profile" };

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function RoommateProfilePage() {
  const user = await requireUserPage("/dashboard/student/roommate");

  const [profile, accountProfile, universities, campuses] = await Promise.all([
    getMyRoommateProfile(user.id),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { gender: true } }),
    prisma.university.findMany({
      select: { id: true, name: true, shortName: true },
      orderBy: { name: "asc" },
    }),
    prisma.campus.findMany({
      select: { id: true, name: true, universityId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initial: RoommateFormInitial | null = profile
    ? {
        universityId: profile.universityId,
        campusId: profile.campusId,
        preferredLocations: profile.preferredLocations,
        budgetMin: profile.budgetMin,
        budgetMax: profile.budgetMax,
        preferredRoomType: profile.preferredRoomType,
        desiredRoommates: profile.desiredRoommates,
        gender: accountProfile?.gender ?? null,
        genderPreference: profile.genderPreference,
        smoking: profile.smoking,
        pets: profile.pets,
        cleanliness: profile.cleanliness,
        sleepSchedule: profile.sleepSchedule,
        studyHabits: profile.studyHabits,
        socialPreference: profile.socialPreference,
        noiseTolerance: profile.noiseTolerance,
        moveInDate: toDateInput(profile.moveInDate),
        bio: profile.bio,
        status: profile.status,
      }
    : null;

  const weights = profile?.preference ?? DEFAULT_WEIGHTS;

  return (
    <div>
      <PageHeader
        title="Roommate profile"
        description="What other students see when you appear in the roommate finder, and how we score a match."
        actions={
          initial ? (
            <Button asChild variant="outline">
              <Link href="/roommates">Browse roommates</Link>
            </Button>
          ) : undefined
        }
      />

      <RoommateProfileForm initial={initial} universities={universities} campuses={campuses} />

      {profile && (
        <div className="mt-6">
          <MatchingWeightsForm
            initial={{
              budgetWeight: weights.budgetWeight,
              locationWeight: weights.locationWeight,
              moveInWeight: weights.moveInWeight,
              lifestyleWeight: weights.lifestyleWeight,
            }}
          />
        </div>
      )}
    </div>
  );
}
