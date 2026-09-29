"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileUpdateSchema } from "@/lib/validation/auth";
import { GENDER_LABELS, STUDENT_LEVELS } from "@/lib/constants";

const NONE = "__none__";

export interface ProfileFormInitial {
  name: string;
  phone: string | null;
  displayName: string | null;
  bio: string | null;
  gender: string | null;
  level: string | null;
  universityId: string | null;
  campusId: string | null;
  facultyId: string | null;
  departmentId: string | null;
}

interface ProfileFormProps {
  initial: ProfileFormInitial;
  isStudent: boolean;
  universities: { id: string; name: string; shortName: string }[];
  campuses: { id: string; name: string; universityId: string }[];
  faculties: { id: string; name: string; universityId: string }[];
  departments: { id: string; name: string; facultyId: string }[];
}

/** Account details. Email and role are not editable here — those are admin-only. */
export function ProfileForm({
  initial,
  isStudent,
  universities,
  campuses,
  faculties,
  departments,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName ?? initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [gender, setGender] = useState(initial.gender ?? NONE);
  const [level, setLevel] = useState(initial.level ?? NONE);
  const [universityId, setUniversityId] = useState(initial.universityId ?? NONE);
  const [campusId, setCampusId] = useState(initial.campusId ?? NONE);
  const [facultyId, setFacultyId] = useState(initial.facultyId ?? NONE);
  const [departmentId, setDepartmentId] = useState(initial.departmentId ?? NONE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const campusOptions = campuses.filter((c) => c.universityId === universityId);
  const facultyOptions = faculties.filter((f) => f.universityId === universityId);
  const departmentOptions = departments.filter((d) => d.facultyId === facultyId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const payload = {
      displayName,
      phone,
      bio,
      gender: gender === NONE ? null : gender,
      level: level === NONE ? null : level,
      universityId: universityId === NONE ? null : universityId,
      campusId: campusId === NONE ? null : campusId,
      facultyId: facultyId === NONE ? null : facultyId,
      departmentId: departmentId === NONE ? null : departmentId,
    };

    const parsed = profileUpdateSchema.safeParse(payload);
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
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save your details");
        return;
      }
      toast.success("Details saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const errorFor = (key: string) =>
    errors[key] ? <p className="text-xs text-red-600">{errors[key]}</p> : null;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            maxLength={80}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
          <p className="text-xs text-slate-500">Shown on your reviews and messages.</p>
          {errorFor("displayName")}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08031234567"
            autoComplete="tel"
            aria-describedby="phone-help"
          />
          <p id="phone-help" className="text-xs text-slate-500">
            Nigerian format. Never shown publicly or shared in messages.
          </p>
          {errorFor("phone")}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gender">Gender</Label>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger id="gender">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Prefer not to say</SelectItem>
            {Object.entries(GENDER_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">
          Optional. Used only when another student explicitly filters roommate results by gender —
          never for ranking or scoring.
        </p>
      </div>

      {isStudent && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="university">University</Label>
              <Select
                value={universityId}
                onValueChange={(value) => {
                  setUniversityId(value);
                  setCampusId(NONE);
                  setFacultyId(NONE);
                  setDepartmentId(NONE);
                }}
              >
                <SelectTrigger id="university">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campus">Campus</Label>
              <Select
                value={campusId}
                onValueChange={setCampusId}
                disabled={campusOptions.length === 0}
              >
                <SelectTrigger id="campus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {campusOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faculty">Faculty</Label>
              <Select
                value={facultyId}
                onValueChange={(value) => {
                  setFacultyId(value);
                  setDepartmentId(NONE);
                }}
                disabled={facultyOptions.length === 0}
              >
                <SelectTrigger id="faculty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {facultyOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
                disabled={departmentOptions.length === 0}
              >
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="level">Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
                {STUDENT_LEVELS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value} level
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="bio">About you</Label>
        <Textarea
          id="bio"
          rows={4}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="text-xs text-slate-500">{bio.length}/500</p>
        {errorFor("bio")}
      </div>

      <Button type="submit" disabled={busy}>
        <Save aria-hidden /> {busy ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
