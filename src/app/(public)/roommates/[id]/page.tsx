import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getMyRoommateProfile } from "@/lib/services/roommate.service";
import { computeCompatibility, DEFAULT_WEIGHTS } from "@/lib/services/matching.service";
import { PageHeader } from "@/components/account/page-header";
import { RoommateActions } from "@/components/roommate/roommate-actions";
import { ReportDialog } from "@/components/report/report-dialog";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CLEANLINESS_LABELS,
  GENDER_LABELS,
  NOISE_TOLERANCE_LABELS,
  PROPERTY_TYPE_LABELS,
  SAFETY_WARNING,
  SLEEP_SCHEDULE_LABELS,
  SOCIAL_PREFERENCE_LABELS,
  STUDY_HABIT_LABELS,
} from "@/lib/constants";
import { formatDate, formatNaira, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await prisma.roommateProfile.findUnique({
    where: { id },
    select: { user: { select: { name: true } }, university: { select: { shortName: true } } },
  });
  if (!profile) return { title: "Roommate profile not found · StudentNest", robots: { index: false } };
  return {
    title: `${profile.user.name.split(" ")[0]} · roommate at ${profile.university.shortName}`,
    robots: { index: false },
  };
}

export default async function RoommateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const viewer = await getSessionUser();

  const [profile, myProfile] = await Promise.all([
    prisma.roommateProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            emailVerified: true,
            profile: { select: { avatarUrl: true, gender: true, level: true } },
          },
        },
        university: { select: { id: true, name: true, shortName: true, slug: true } },
        campus: { select: { id: true, name: true } },
      },
    }),
    viewer ? getMyRoommateProfile(viewer.id) : Promise.resolve(null),
  ]);

  if (!profile) notFound();

  const isOwn = viewer?.id === profile.userId;
  // A paused or closed profile stays reachable for its owner but is hidden from everyone else.
  if (profile.status !== "ACTIVE" && !isOwn) notFound();

  const weights = myProfile?.preference ?? DEFAULT_WEIGHTS;
  const compatibility =
    myProfile && !isOwn ? computeCompatibility(myProfile, profile, weights) : null;

  const favorited = viewer
    ? Boolean(
        await prisma.favoriteRoommate.findUnique({
          where: { userId_roommateProfileId: { userId: viewer.id, roommateProfileId: profile.id } },
          select: { id: true },
        }),
      )
    : false;

  const firstName = profile.user.name.split(" ")[0];
  const displayName = viewer ? profile.user.name : `${firstName} ${profile.user.name.split(" ")[1]?.[0]?.toUpperCase() ?? ""}.`;

  const habits = [
    { label: "Cleanliness", value: CLEANLINESS_LABELS[profile.cleanliness] },
    { label: "Sleep schedule", value: SLEEP_SCHEDULE_LABELS[profile.sleepSchedule] },
    { label: "Study habits", value: STUDY_HABIT_LABELS[profile.studyHabits] },
    { label: "Social life", value: SOCIAL_PREFERENCE_LABELS[profile.socialPreference] },
    { label: "Noise tolerance", value: NOISE_TOLERANCE_LABELS[profile.noiseTolerance] },
    { label: "Smoking", value: profile.smoking ? "Smokes" : "Does not smoke" },
    { label: "Pets", value: profile.pets ? "Has pets" : "No pets" },
    { label: "Room type wanted", value: profile.preferredRoomType ? PROPERTY_TYPE_LABELS[profile.preferredRoomType] : "Flexible" },
    { label: "Roommates wanted", value: String(profile.desiredRoommates) },
    ...(profile.user.profile?.gender
      ? [{ label: "Gender (self-stated)", value: GENDER_LABELS[profile.user.profile.gender] }]
      : []),
    ...(profile.user.profile?.level ? [{ label: "Level", value: profile.user.profile.level }] : []),
  ];

  return (
    <div className="container-page py-8">
      <PageHeader
        title={displayName}
        backHref="/roommates"
        backLabel="All roommate profiles"
        description={`${profile.university.name}${profile.campus ? ` · ${profile.campus.name}` : ""} · profile last updated ${formatDate(profile.updatedAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start gap-4 space-y-0">
              <Avatar className="h-16 w-16">
                {profile.user.profile?.avatarUrl && (
                  <AvatarImage src={profile.user.profile.avatarUrl} alt="" />
                )}
                <AvatarFallback>{initials(profile.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <CardTitle>{displayName}</CardTitle>
                <CardDescription>
                  Joined StudentNest {formatDate(profile.user.createdAt)}
                  {profile.user.emailVerified ? " · email verified" : " · email not verified"}
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="default">{profile.university.shortName}</Badge>
                  {profile.campus && <Badge variant="outline">{profile.campus.name}</Badge>}
                  {!profile.user.emailVerified && (
                    <Badge variant="pending" title="This person has not confirmed their email address yet.">
                      Email unverified
                    </Badge>
                  )}
                  {profile.status !== "ACTIVE" && <Badge variant="neutral">{profile.status}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-700">Budget</p>
                <p className="mt-0.5 text-slate-900">
                  {formatNaira(profile.budgetMin)} – {formatNaira(profile.budgetMax)} per{" "}
                  {profile.budgetMax >= 400_000 ? "year" : "month"}
                </p>
                <p className="mt-2 font-medium text-slate-700">Wants to move in</p>
                <p className="mt-0.5 text-slate-900">{formatDate(profile.moveInDate)}</p>
              </div>

              {profile.preferredLocations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700">Preferred areas</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.preferredLocations.map((location) => (
                      <Badge key={location} variant="outline">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.bio ? (
                <div>
                  <p className="text-sm font-medium text-slate-700">About</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{profile.bio}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  This person has not written a bio. Ask them directly rather than assuming.
                </p>
              )}

              <dl className="grid gap-x-6 gap-y-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
                {habits.map((habit) => (
                  <div key={habit.label} className="flex justify-between gap-3 text-sm">
                    <dt className="text-slate-500">{habit.label}</dt>
                    <dd className="text-right font-medium text-slate-900">{habit.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="text-xs text-slate-500">
                Everything above was entered by {firstName} themselves. StudentNest does not verify
                roommate profiles, and self-reported habits are not a guarantee of how someone will
                actually live.
              </p>
            </CardContent>
          </Card>

          {compatibility && (
            <Card>
              <CardHeader>
                <CardTitle>Your match: {compatibility.score}%</CardTitle>
                <CardDescription>
                  Weighted from your own profile: budget {weights.budgetWeight}%, location{" "}
                  {weights.locationWeight}%, move-in timing {weights.moveInWeight}%, lifestyle{" "}
                  {weights.lifestyleWeight}%. Change the weights from{" "}
                  <Link href="/dashboard/student/roommate" className="underline">
                    your roommate dashboard
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div
                  className="h-2 w-full rounded-full bg-slate-100"
                  role="img"
                  aria-label={`Compatibility ${compatibility.score} out of 100`}
                >
                  <div
                    className="h-2 rounded-full bg-brand-600"
                    style={{ width: `${compatibility.score}%` }}
                  />
                </div>

                {compatibility.reasons.length === 0 && compatibility.mismatches.length === 0 ? (
                  <p className="text-slate-600">
                    Nothing in your profiles overlaps strongly enough to explain the score either
                    way. Read the details above and message them.
                  </p>
                ) : (
                  <>
                    {compatibility.reasons.length > 0 && (
                      <ul className="space-y-1">
                        {compatibility.reasons.map((reason) => (
                          <li key={reason} className="flex gap-2 text-slate-700">
                            <span className="text-emerald-700" aria-hidden>
                              +
                            </span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    )}
                    {compatibility.mismatches.length > 0 && (
                      <ul className="space-y-1">
                        {compatibility.mismatches.map((mismatch) => (
                          <li key={mismatch} className="flex gap-2 text-slate-700">
                            <span className="text-amber-700" aria-hidden>
                              !
                            </span>
                            {mismatch}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                <p className="text-xs text-slate-500">
                  A high score means your stated preferences overlap — it is not a character
                  reference. Gender, ethnicity, religion and disability are never scored.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Where to look next</CardTitle>
              <CardDescription>
                Sharing a place is easier when you are both searching in the same areas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/locations/${profile.university.slug}`}>
                    Housing near {profile.university.shortName}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/properties?university=${encodeURIComponent(profile.university.shortName)}&maxRent=${profile.budgetMax}`}
                  >
                    Listings within their budget
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact {firstName}</CardTitle>
              <CardDescription>
                Messages stay inside StudentNest. Phone numbers are never revealed on either side.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <RoommateActions
                userId={profile.userId}
                profileId={profile.id}
                name={profile.user.name}
                initialFavorited={favorited}
                signedIn={Boolean(viewer)}
                isOwn={isOwn}
              />
              {!viewer && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/login?callbackUrl=/roommates/${profile.id}`}>
                    Log in to message
                  </Link>
                </Button>
              )}
              {!isOwn && viewer && (
                <ReportDialog
                  targetType="USER"
                  targetId={profile.userId}
                  label="Report this profile"
                  className="w-full"
                />
              )}
            </CardContent>
          </Card>

          <Alert variant="warning">
            <AlertTitle>Meet before you pay anything</AlertTitle>
            <p className="text-sm">{SAFETY_WARNING}</p>
            <p className="mt-2 text-sm">
              Splitting rent with someone you met online carries real risk. Meet in a public place,
              see the property together, and confirm the landlord or caretaker is who they say they
              are before any money changes hands.
            </p>
          </Alert>
        </aside>
      </div>
    </div>
  );
}
