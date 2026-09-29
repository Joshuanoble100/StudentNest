"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roommateProfileSchema } from "@/lib/validation/roommate";
import {
  CLEANLINESS_LABELS,
  GENDER_LABELS,
  NOISE_TOLERANCE_LABELS,
  PROPERTY_TYPE_LABELS,
  ROOMMATE_STATUS_LABELS,
  SLEEP_SCHEDULE_LABELS,
  SOCIAL_PREFERENCE_LABELS,
  STUDY_HABIT_LABELS,
} from "@/lib/constants";

const NONE = "__none__";

export interface RoommateFormInitial {
  universityId: string;
  campusId: string | null;
  preferredLocations: string[];
  budgetMin: number;
  budgetMax: number;
  preferredRoomType: string | null;
  desiredRoommates: number;
  gender: string | null;
  genderPreference: string | null;
  smoking: boolean;
  pets: boolean;
  cleanliness: string;
  sleepSchedule: string;
  studyHabits: string;
  socialPreference: string;
  noiseTolerance: string;
  moveInDate: string;
  bio: string | null;
  status: string;
}

interface Option {
  value: string;
  label: string;
}

interface RoommateProfileFormProps {
  initial: RoommateFormInitial | null;
  universities: { id: string; name: string; shortName: string }[];
  campuses: { id: string; name: string; universityId: string }[];
}

function toOptions(map: Record<string, string>): Option[] {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

/**
 * Create/edit the signed-in user's roommate profile.
 *
 * Gender appears twice on purpose: `gender` is what the user chooses to disclose
 * about themselves, and `genderPreference` is an explicit filter they apply when
 * browsing. Neither value is ever used to compute a compatibility score — the
 * matching service scores budget, location, move-in date and lifestyle habits
 * only. That is stated in the UI so nobody has to guess.
 */
export function RoommateProfileForm({ initial, universities, campuses }: RoommateProfileFormProps) {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [universityId, setUniversityId] = useState(initial?.universityId ?? "");
  const [campusId, setCampusId] = useState(initial?.campusId ?? "");
  const [locations, setLocations] = useState(initial?.preferredLocations.join(", ") ?? "");
  const [budgetMin, setBudgetMin] = useState(String(initial?.budgetMin ?? 50000));
  const [budgetMax, setBudgetMax] = useState(String(initial?.budgetMax ?? 150000));
  const [preferredRoomType, setPreferredRoomType] = useState(initial?.preferredRoomType ?? "");
  const [desiredRoommates, setDesiredRoommates] = useState(String(initial?.desiredRoommates ?? 1));
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [genderPreference, setGenderPreference] = useState(initial?.genderPreference ?? "ANY");
  const [smoking, setSmoking] = useState(initial?.smoking ?? false);
  const [pets, setPets] = useState(initial?.pets ?? false);
  const [cleanliness, setCleanliness] = useState(initial?.cleanliness ?? "BALANCED");
  const [sleepSchedule, setSleepSchedule] = useState(initial?.sleepSchedule ?? "FLEXIBLE");
  const [studyHabits, setStudyHabits] = useState(initial?.studyHabits ?? "MIXED");
  const [socialPreference, setSocialPreference] = useState(
    initial?.socialPreference ?? "OCCASIONALLY_SOCIAL",
  );
  const [noiseTolerance, setNoiseTolerance] = useState(initial?.noiseTolerance ?? "MEDIUM");
  const [moveInDate, setMoveInDate] = useState(initial?.moveInDate ?? today);
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const campusOptions = campuses.filter((c) => c.universityId === universityId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const payload = {
      universityId,
      campusId: campusId && campusId !== NONE ? campusId : null,
      preferredLocations: locations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      budgetMin,
      budgetMax,
      preferredRoomType: preferredRoomType && preferredRoomType !== NONE ? preferredRoomType : null,
      desiredRoommates,
      gender: gender && gender !== NONE ? gender : null,
      genderPreference: genderPreference === "ANY" ? "ANY" : genderPreference,
      smoking,
      pets,
      cleanliness,
      sleepSchedule,
      studyHabits,
      socialPreference,
      noiseTolerance,
      moveInDate,
      bio: bio.trim() || undefined,
      status,
    };

    // Validate with the exact schema the API uses, so the two can never drift.
    const parsed = roommateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/roommates/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save your roommate profile");
        return;
      }
      toast.success("Roommate profile saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const errorFor = (key: string) => (errors[key] ? <p className="text-xs text-red-600">{errors[key]}</p> : null);

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where and when</CardTitle>
          <CardDescription>
            Used for matching. Only the areas you list are shown to other students — never your exact
            address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="university">University</Label>
              <Select
                value={universityId || undefined}
                onValueChange={(value) => {
                  setUniversityId(value);
                  setCampusId("");
                }}
              >
                <SelectTrigger id="university">
                  <SelectValue placeholder="Select your university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorFor("universityId")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campus">Campus</Label>
              <Select
                value={campusId || NONE}
                onValueChange={(value) => setCampusId(value === NONE ? "" : value)}
                disabled={campusOptions.length === 0}
              >
                <SelectTrigger id="campus">
                  <SelectValue placeholder={campusOptions.length ? "Any campus" : "Select a university first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any campus</SelectItem>
                  {campusOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="locations">Preferred areas</Label>
            <Input
              id="locations"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              placeholder="Ifite, UNIZIK Junction, Aroma Junction"
              aria-describedby="locations-help"
            />
            <p id="locations-help" className="text-xs text-slate-500">
              Comma separated, up to 10. These are area names only.
            </p>
            {errorFor("preferredLocations")}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="budgetMin">Budget min (₦)</Label>
              <Input
                id="budgetMin"
                type="number"
                min={0}
                step={1000}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              />
              {errorFor("budgetMin")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budgetMax">Budget max (₦)</Label>
              <Input
                id="budgetMax"
                type="number"
                min={0}
                step={1000}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
              {errorFor("budgetMax")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="moveIn">Move-in date</Label>
              <Input
                id="moveIn"
                type="date"
                value={moveInDate}
                min={today}
                onChange={(e) => setMoveInDate(e.target.value)}
              />
              {errorFor("moveInDate")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="roomType">Room type you want</Label>
              <Select
                value={preferredRoomType || NONE}
                onValueChange={(value) => setPreferredRoomType(value === NONE ? "" : value)}
              >
                <SelectTrigger id="roomType">
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any type</SelectItem>
                  {toOptions(PROPERTY_TYPE_LABELS).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desired">Roommates wanted</Label>
              <Input
                id="desired"
                type="number"
                min={1}
                max={10}
                value={desiredRoommates}
                onChange={(e) => setDesiredRoommates(e.target.value)}
              />
              {errorFor("desiredRoommates")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Living habits</CardTitle>
          <CardDescription>
            These four groups — cleanliness, sleep, study and social habits, plus noise tolerance —
            are what the compatibility score is actually built from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="cleanliness"
              label="Cleanliness"
              value={cleanliness}
              onChange={setCleanliness}
              options={toOptions(CLEANLINESS_LABELS)}
            />
            <SelectField
              id="sleep"
              label="Sleep schedule"
              value={sleepSchedule}
              onChange={setSleepSchedule}
              options={toOptions(SLEEP_SCHEDULE_LABELS)}
            />
            <SelectField
              id="study"
              label="Study habits"
              value={studyHabits}
              onChange={setStudyHabits}
              options={toOptions(STUDY_HABIT_LABELS)}
            />
            <SelectField
              id="social"
              label="Social preference"
              value={socialPreference}
              onChange={setSocialPreference}
              options={toOptions(SOCIAL_PREFERENCE_LABELS)}
            />
            <SelectField
              id="noise"
              label="Noise tolerance"
              value={noiseTolerance}
              onChange={setNoiseTolerance}
              options={toOptions(NOISE_TOLERANCE_LABELS)}
            />
            <SelectField
              id="status"
              label="Profile visibility"
              value={status}
              onChange={setStatus}
              options={toOptions(ROOMMATE_STATUS_LABELS)}
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <div className="flex items-center gap-2">
              <Switch id="smoking" checked={smoking} onCheckedChange={setSmoking} />
              <Label htmlFor="smoking" className="font-normal">
                I smoke
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pets" checked={pets} onCheckedChange={setPets} />
              <Label htmlFor="pets" className="font-normal">
                I have pets
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">About you</Label>
            <Textarea
              id="bio"
              rows={4}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What should a potential roommate know? Course, habits, what you are looking for."
              aria-describedby="bio-help"
            />
            <p id="bio-help" className="text-xs text-slate-500">
              Optional, up to 1000 characters. Do not include your phone number or exact address —
              messaging stays on StudentNest.
            </p>
            {errorFor("bio")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gender</CardTitle>
          <CardDescription>
            Both fields are optional and both are under your control.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info">
            Gender is never part of the compatibility score. It is only used when you explicitly
            filter search results, and it is never used to hide your profile from anyone.
          </Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="gender"
              label="My gender (shown on your profile)"
              value={gender || NONE}
              onChange={(value) => setGender(value === NONE ? "" : value)}
              options={[{ value: NONE, label: "Prefer not to say" }, ...toOptions(GENDER_LABELS)]}
            />
            <SelectField
              id="genderPreference"
              label="When browsing, show me"
              value={genderPreference}
              onChange={setGenderPreference}
              options={[
                { value: "ANY", label: "Everyone" },
                { value: "MALE", label: "Male students" },
                { value: "FEMALE", label: "Female students" },
              ]}
            />
          </div>
          <p className="text-xs text-slate-500">
            This filter changes what you see. It does not change your score, and other students are
            not told you applied it.
          </p>
        </CardContent>
      </Card>

      {Object.keys(errors).length > 0 && (
        <Alert variant="danger">
          Some fields need attention before this can be saved.
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          <Save aria-hidden /> {busy ? "Saving…" : initial ? "Save changes" : "Create roommate profile"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.refresh()} disabled={busy}>
          Reset
        </Button>
      </div>
    </form>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
