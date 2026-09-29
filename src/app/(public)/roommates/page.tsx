import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getMyRoommateProfile, listRoommates } from "@/lib/services/roommate.service";
import { DEFAULT_WEIGHTS } from "@/lib/services/matching.service";
import { PageHeader } from "@/components/account/page-header";
import { RoommateActions } from "@/components/roommate/roommate-actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/search/pagination";
import {
  CLEANLINESS_LABELS,
  GENDER_LABELS,
  NOISE_TOLERANCE_LABELS,
  PROPERTY_TYPE_LABELS,
  SLEEP_SCHEDULE_LABELS,
  SOCIAL_PREFERENCE_LABELS,
  STUDY_HABIT_LABELS,
} from "@/lib/constants";
import { formatDate, formatNaira, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find a roommate · StudentNest",
  description:
    "Browse student roommate profiles by budget, area, move-in date and living habits. Compatibility scores show exactly what they are based on.",
};

const GENDERS = ["ANY", "FEMALE", "MALE"] as const;

function displayName(name: string, signedIn: boolean) {
  if (signedIn) return name;
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]?.toUpperCase() ?? ""}.` : name;
}

export default async function RoommatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    university?: string;
    minBudget?: string;
    maxBudget?: string;
    smoking?: string;
    gender?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const viewer = await getSessionUser();

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const universityId = uuidPattern.test(params.university ?? "") ? (params.university as string) : undefined;
  const minBudget = Number.isFinite(Number(params.minBudget)) && Number(params.minBudget) > 0 ? Number(params.minBudget) : undefined;
  const maxBudget = Number.isFinite(Number(params.maxBudget)) && Number(params.maxBudget) > 0 ? Number(params.maxBudget) : undefined;
  const smoking = params.smoking === "true" ? true : params.smoking === "false" ? false : undefined;
  const gender = GENDERS.includes((params.gender ?? "") as never)
    ? (params.gender as "MALE" | "FEMALE" | "ANY")
    : "ANY";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const [myProfile, universities, result] = await Promise.all([
    viewer ? getMyRoommateProfile(viewer.id) : Promise.resolve(null),
    prisma.university.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, shortName: true },
    }),
    listRoommates(viewer?.id ?? null, {
      universityId,
      budgetMin: minBudget,
      budgetMax: maxBudget,
      smoking,
      genderPreference: gender,
      page,
    }),
  ]);

  const favoritedIds = new Set(
    viewer
      ? (
          await prisma.favoriteRoommate.findMany({
            where: { userId: viewer.id, roommateProfileId: { in: result.items.map((i) => i.id) } },
            select: { roommateProfileId: true },
          })
        ).map((row) => row.roommateProfileId)
      : [],
  );

  const weights = myProfile?.preference ?? DEFAULT_WEIGHTS;
  const signedIn = Boolean(viewer);
  const filtered = Boolean(universityId || minBudget || maxBudget || smoking !== undefined || gender !== "ANY");

  const hrefFor = (next: number) => {
    const query = new URLSearchParams();
    if (universityId) query.set("university", universityId);
    if (minBudget) query.set("minBudget", String(minBudget));
    if (maxBudget) query.set("maxBudget", String(maxBudget));
    if (smoking !== undefined) query.set("smoking", String(smoking));
    if (gender !== "ANY") query.set("gender", gender);
    if (next > 1) query.set("page", String(next));
    const qs = query.toString();
    return qs ? `/roommates?${qs}` : "/roommates";
  };

  return (
    <div className="container-page py-8">
      <PageHeader
        title="Find a roommate"
        description={`${result.total} student profile${result.total === 1 ? "" : "s"} looking for a place. Compatibility is computed from what people told us about budget, location, move-in date and living habits — nothing else.`}
      />

      <Alert variant="info" className="mb-6">
        <AlertTitle>How the score works</AlertTitle>
        <p className="text-sm">
          Each match is a weighted sum of four things: budget overlap ({weights.budgetWeight}%),
          location ({weights.locationWeight}%), move-in timing ({weights.moveInWeight}%) and
          lifestyle habits ({weights.lifestyleWeight}%).{" "}
          {myProfile ? (
            <>
              You can change those weights from{" "}
              <Link href="/dashboard/student/roommate" className="font-medium underline">
                your roommate dashboard
              </Link>
              .
            </>
          ) : (
            <>
              <Link href="/login?callbackUrl=/roommates" className="font-medium underline">
                Sign in
              </Link>{" "}
              and create your own profile to see scores, and to change how much each factor counts.
            </>
          )}{" "}
          Gender, ethnicity, religion, disability and any other protected characteristic are never
          part of the score. The gender filter below only narrows the list if you choose to use it.
        </p>
      </Alert>

      <form
        method="get"
        action="/roommates"
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="filter-university" className="text-sm font-medium text-slate-700">
            University
          </label>
          <select
            id="filter-university"
            name="university"
            defaultValue={universityId ?? ""}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
          >
            <option value="">Any university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name} ({university.shortName})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-min" className="text-sm font-medium text-slate-700">
            Min budget (₦)
          </label>
          <Input
            id="filter-min"
            name="minBudget"
            type="number"
            min={0}
            step={5000}
            defaultValue={minBudget ?? ""}
            placeholder="30000"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-max" className="text-sm font-medium text-slate-700">
            Max budget (₦)
          </label>
          <Input
            id="filter-max"
            name="maxBudget"
            type="number"
            min={0}
            step={5000}
            defaultValue={maxBudget ?? ""}
            placeholder="80000"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-smoking" className="text-sm font-medium text-slate-700">
            Smoking
          </label>
          <select
            id="filter-smoking"
            name="smoking"
            defaultValue={smoking === undefined ? "" : String(smoking)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
          >
            <option value="">Either</option>
            <option value="false">Non-smoker</option>
            <option value="true">Smoker</option>
          </select>
        </div>

        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="filter-gender" className="text-sm font-medium text-slate-700">
            Gender preference (optional)
          </label>
          <select
            id="filter-gender"
            name="gender"
            defaultValue={gender}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-brand-600 focus:outline-2 focus:outline-offset-1 focus:outline-brand-600"
          >
            {GENDERS.map((value) => (
              <option key={value} value={value}>
                {value === "ANY" ? "No preference" : GENDER_LABELS[value]}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Filters by the gender each person stated on their own profile. It is applied only
            because you asked for it, and it never changes anyone&rsquo;s score.
          </p>
        </div>

        <div className="flex items-end gap-2 lg:col-span-3">
          <Button type="submit">Apply filters</Button>
          {filtered && (
            <Button type="button" variant="ghost" asChild>
              <Link href="/roommates">Clear</Link>
            </Button>
          )}
        </div>
      </form>

      {!myProfile && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <p className="text-sm text-slate-700">
            You are browsing without a roommate profile, so we cannot score matches for you —
            scoring needs your own stated budget, areas and habits.
          </p>
          <Button asChild size="sm">
            <Link href={viewer ? "/dashboard/student/roommate" : `/register?callbackUrl=/roommates`}>
              {viewer ? "Create your roommate profile" : "Create an account"}
            </Link>
          </Button>
        </div>
      )}

      {result.items.length === 0 ? (
        <EmptyState
          title={filtered ? "No profiles match those filters" : "No roommate profiles yet"}
          description={
            filtered
              ? "Widen your budget range or clear the filters — students join at different times of the semester."
              : "Be the first: create a roommate profile and it will appear here for other students."
          }
          action={
            filtered ? (
              <Button asChild variant="outline">
                <Link href="/roommates">Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={viewer ? "/dashboard/student/roommate" : "/register?callbackUrl=/roommates"}>
                  Create your profile
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((profile) => {
            const compatibility = profile.compatibility;
            const isOwn = viewer?.id === profile.userId;
            return (
              <li
                key={profile.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11">
                    {profile.user.profile?.avatarUrl && (
                      <AvatarImage src={profile.user.profile.avatarUrl} alt="" />
                    )}
                    <AvatarFallback>{initials(profile.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      <Link href={`/roommates/${profile.id}`} className="hover:underline">
                        {displayName(profile.user.name, signedIn)}
                      </Link>
                    </p>
                    <p className="truncate text-sm text-slate-600">
                      {profile.university.shortName}
                      {profile.campus ? ` · ${profile.campus.name}` : ""}
                    </p>
                  </div>
                  {compatibility && (
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums text-brand-700">
                        {compatibility.score}%
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">match</p>
                    </div>
                  )}
                </div>

                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Budget</dt>
                    <dd className="font-medium text-slate-900">
                      {formatNaira(profile.budgetMin)} – {formatNaira(profile.budgetMax)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Move in</dt>
                    <dd className="font-medium text-slate-900">{formatDate(profile.moveInDate)}</dd>
                  </div>
                  {profile.preferredRoomType && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Looking for</dt>
                      <dd className="font-medium text-slate-900">
                        {PROPERTY_TYPE_LABELS[profile.preferredRoomType]}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Roommates wanted</dt>
                    <dd className="font-medium text-slate-900">{profile.desiredRoommates}</dd>
                  </div>
                </dl>

                {profile.preferredLocations.length > 0 && (
                  <p className="mt-3 text-xs text-slate-600">
                    <span className="font-medium">Preferred areas:</span>{" "}
                    {profile.preferredLocations.slice(0, 4).join(", ")}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{CLEANLINESS_LABELS[profile.cleanliness]}</Badge>
                  <Badge variant="outline">{SLEEP_SCHEDULE_LABELS[profile.sleepSchedule]}</Badge>
                  <Badge variant="outline">{STUDY_HABIT_LABELS[profile.studyHabits]}</Badge>
                  <Badge variant="outline">{SOCIAL_PREFERENCE_LABELS[profile.socialPreference]}</Badge>
                  <Badge variant="outline">{NOISE_TOLERANCE_LABELS[profile.noiseTolerance]} noise</Badge>
                  <Badge variant={profile.smoking ? "pending" : "neutral"}>
                    {profile.smoking ? "Smoker" : "Non-smoker"}
                  </Badge>
                  {profile.pets && <Badge variant="neutral">Has pets</Badge>}
                </div>

                {profile.bio && (
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">{profile.bio}</p>
                )}

                {compatibility && (compatibility.reasons.length > 0 || compatibility.mismatches.length > 0) && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">
                    {compatibility.reasons.length > 0 && (
                      <p className="text-slate-700">
                        <span className="font-semibold text-emerald-700">Why:</span>{" "}
                        {compatibility.reasons.join(" · ")}
                      </p>
                    )}
                    {compatibility.mismatches.length > 0 && (
                      <p className="mt-1 text-slate-600">
                        <span className="font-semibold text-amber-700">Watch out:</span>{" "}
                        {compatibility.mismatches.join(" · ")}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <RoommateActions
                    userId={profile.userId}
                    profileId={profile.id}
                    name={profile.user.name}
                    initialFavorited={favoritedIds.has(profile.id)}
                    signedIn={signedIn}
                    isOwn={isOwn}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6">
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
